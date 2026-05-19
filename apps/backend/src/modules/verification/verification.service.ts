import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Document, DocumentStatus } from 'src/database/models/document.model';
import { VerificationAttempt } from 'src/database/models/verification-attempt.model';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class VerificationService {
  constructor(
    @InjectQueue('notification') private notificationQueue: Queue,
    private auditService: AuditService,
  ) {}

  async adminReview(
    documentId: string,
    adminId: string,
    decision: 'approved' | 'rejected',
    reason: string | undefined,
    clientVersion: number,
  ) {
    const doc = await Document.findByPk(documentId);
    if (!doc) throw new NotFoundException('Document not found');

    if (doc.status !== DocumentStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Document is not in PENDING_REVIEW state (current: ${doc.status})`,
      );
    }

    const newStatus =
      decision === 'approved'
        ? DocumentStatus.APPROVED
        : DocumentStatus.REJECTED;

    // Optimistic locking: only update if version matches
    const [affectedCount] = await Document.update(
      {
        status: newStatus,
        rejectionReason: reason ?? null,
        version: doc.version + 1,
      },
      { where: { id: documentId, version: clientVersion } as any },
    );

    if (affectedCount === 0) {
      throw new ConflictException(
        'This document has already been reviewed by another admin. Please refresh to see the current status.',
      );
    }

    await this.auditService.log({
      documentId,
      actorId: adminId,
      actorRole: 'ADMIN',
      action: decision === 'approved' ? 'ADMIN_APPROVED' : 'ADMIN_REJECTED',
      fromStatus: DocumentStatus.PENDING_REVIEW,
      toStatus: newStatus,
      metadata: { reason },
    });

    await this.notificationQueue.add(
      'send-email',
      { documentId, sellerId: doc.sellerId, outcome: decision },
      { attempts: 3, backoff: { type: 'fixed', delay: 300_000 } },
    );

    return { success: true, newStatus };
  }

  async getAttempts(documentId: string) {
    return VerificationAttempt.findAll({
      where: { documentId },
      order: [['attemptedAt', 'ASC']],
    });
  }
}
