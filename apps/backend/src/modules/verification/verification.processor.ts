import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Sequelize } from 'sequelize-typescript';
import { z } from 'zod';
import { Document, DocumentStatus } from 'src/database/models/document.model';
import { VerificationAttempt } from 'src/database/models/verification-attempt.model';
import { AuditService } from '../audit/audit.service';

const MockResponseSchema = z.object({
  result: z.enum(['verified', 'rejected', 'inconclusive']),
  confidence: z.number().optional(),
  message: z.string().optional(),
});

const MAX_ATTEMPTS = 5;
const INCONCLUSIVE_RETRY_MESSAGE = 'Inconclusive - retrying';

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

@Processor('verification')
export class VerificationProcessor {
  private readonly logger = new Logger(VerificationProcessor.name);

  constructor(
    @InjectQueue('notification') private notificationQueue: Queue,
    private httpService: HttpService,
    private auditService: AuditService,
    private config: ConfigService,
  ) {}

  @Process('verify')
  async handleVerify(job: Job<{ documentId: string }>) {
    const { documentId } = job.data;
    this.logger.log(
      `Processing verification for document ${documentId} (attempt ${job.attemptsMade + 1})`,
    );

    const doc = await Document.findByPk(documentId);

    // Idempotency guard
    if (!doc || doc.status !== DocumentStatus.PENDING_VERIFICATION) {
      this.logger.log(
        `Document ${documentId} is no longer PENDING_VERIFICATION, skipping`,
      );
      return;
    }

    const attemptNumber = job.attemptsMade + 1;
    const startTime = Date.now();

    try {
      const mockUrl = this.config.get<string>(
        'MOCK_SERVICE_URL',
        'http://localhost:8080',
      );
      const response = await firstValueFrom(
        this.httpService.post(
          `${mockUrl}/internal/mock-verify`,
          { documentId, fileName: doc.fileName },
          { timeout: 30_000 },
        ),
      );

      const durationMs = Date.now() - startTime;
      const parsed = MockResponseSchema.safeParse(response.data);

      if (!parsed.success) {
        throw new Error(
          `Invalid response from mock service: ${JSON.stringify(response.data)}`,
        );
      }

      const { result } = parsed.data;

      await VerificationAttempt.create({
        documentId,
        attemptNumber,
        rawResult: result,
        rawResponse: response.data,
        durationMs,
      });

      if (result === 'verified') {
        await this.transition(
          doc,
          DocumentStatus.APPROVED,
          null,
          'SYSTEM_VERIFIED',
        );
        await this.enqueueNotification(doc.id, doc.sellerId, 'approved');
      } else if (result === 'rejected') {
        await this.transition(
          doc,
          DocumentStatus.REJECTED,
          'Document could not be verified by automated system.',
          'SYSTEM_REJECTED',
        );
        await this.enqueueNotification(doc.id, doc.sellerId, 'rejected');
      } else {
        // inconclusive
        if (attemptNumber >= MAX_ATTEMPTS) {
          await this.transition(
            doc,
            DocumentStatus.PENDING_REVIEW,
            null,
            'ESCALATED_TO_ADMIN',
            {
              reason:
                'Max verification attempts reached with inconclusive result',
              attempts: attemptNumber,
            },
          );
        } else {
          this.logger.log(`Inconclusive result for ${documentId}, will retry`);
          throw new Error(INCONCLUSIVE_RETRY_MESSAGE);
        }
      }
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMessage = getErrorMessage(err);
      const isInconclusiveRetry =
        errorMessage === INCONCLUSIVE_RETRY_MESSAGE;

      if (!isInconclusiveRetry) {
        await VerificationAttempt.create({
          documentId,
          attemptNumber,
          rawResult: null,
          rawResponse: null,
          errorMessage,
          durationMs,
        });
      }

      if (attemptNumber >= MAX_ATTEMPTS) {
        const freshDoc = await Document.findByPk(documentId);
        if (
          freshDoc &&
          freshDoc.status === DocumentStatus.PENDING_VERIFICATION
        ) {
          await this.transition(
            freshDoc,
            DocumentStatus.PENDING_REVIEW,
            null,
            'ESCALATED_TO_ADMIN',
            {
              reason: isInconclusiveRetry
                ? 'Repeated inconclusive results'
                : 'External service unreachable after max retries',
              attempts: attemptNumber,
            },
          );
        }
        return;
      }

      throw err;
    }
  }

  @OnQueueFailed()
  onFailed(job: Job, err: unknown) {
    this.logger.error(`Job ${job.id} failed: ${getErrorMessage(err)}`);
  }

  private async transition(
    doc: Document,
    newStatus: DocumentStatus,
    rejectionReason: string | null,
    action: string,
    metadata?: Record<string, any>,
  ) {
    const fromStatus = doc.status;
    doc.status = newStatus;
    doc.rejectionReason = rejectionReason;
    doc.version += 1;
    await doc.save();

    await this.auditService.log({
      documentId: doc.id,
      actorId: null,
      actorRole: 'SYSTEM',
      action,
      fromStatus,
      toStatus: newStatus,
      metadata,
    });
  }

  private async enqueueNotification(
    documentId: string,
    sellerId: string,
    outcome: 'approved' | 'rejected',
  ) {
    await this.notificationQueue.add(
      'send-email',
      { documentId, sellerId, outcome },
      { attempts: 3, backoff: { type: 'fixed', delay: 300_000 } },
    );
  }
}
