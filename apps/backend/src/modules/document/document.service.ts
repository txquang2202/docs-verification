import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Document, DocumentStatus } from 'src/database/models/document.model';
import { User } from 'src/database/models/user.model';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class DocumentService {
  constructor(
    @InjectQueue('verification') private verificationQueue: Queue,
    private auditService: AuditService,
  ) {}

  async upload(sellerId: string, file: Express.Multer.File): Promise<Document> {
    const existing = await Document.findOne({ where: { sellerId } });
    if (existing) {
      throw new BadRequestException(
        'You already have a document under review. Re-upload is not supported yet.',
      );
    }

    const doc = await Document.create({
      sellerId,
      filePath: file.path,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      status: DocumentStatus.PENDING_VERIFICATION,
    });

    await this.auditService.log({
      documentId: doc.id,
      actorId: sellerId,
      actorRole: 'SELLER',
      action: 'DOCUMENT_UPLOADED',
      fromStatus: null,
      toStatus: DocumentStatus.PENDING_VERIFICATION,
      metadata: { fileName: file.originalname, fileSize: file.size },
    });

    await this.verificationQueue.add(
      'verify',
      { documentId: doc.id },
      { attempts: 5, backoff: { type: 'exponential', delay: 60_000 } },
    );

    return doc;
  }

  async getBySellerOrThrow(sellerId: string): Promise<Document> {
    const doc = await Document.findOne({ where: { sellerId } });
    if (!doc) throw new NotFoundException('No document found for this seller');
    return doc;
  }

  async findById(id: string): Promise<Document | null> {
    return Document.findByPk(id);
  }

  async getPendingReview(): Promise<Document[]> {
    return Document.findAll({
      where: { status: DocumentStatus.PENDING_REVIEW },
      include: [{ model: User, as: 'seller', attributes: ['id', 'email'] }],
      order: [['updatedAt', 'ASC']],
    });
  }

  async getAllDocuments(): Promise<Document[]> {
    return Document.findAll({
      include: [{ model: User, as: 'seller', attributes: ['id', 'email'] }],
      order: [['uploadedAt', 'DESC']],
    });
  }

  /**
   * Optimistic locking via raw UPDATE ... WHERE version = :version
   * Returns updated document or null if version mismatch.
   */
  async updateStatusWithOptimisticLock(
    id: string,
    expectedVersion: number,
    newStatus: DocumentStatus,
    rejectionReason?: string,
  ): Promise<Document | null> {
    const [affectedCount] = await Document.update(
      {
        status: newStatus,
        rejectionReason: rejectionReason ?? null,
        version: Sequelize.literal('version + 1') as any,
      },
      {
        where: { id, version: expectedVersion } as any,
      },
    );

    if (affectedCount === 0) return null; // version mismatch
    return Document.findByPk(id);
  }

  async save(doc: Document): Promise<Document> {
    return doc.save();
  }
}
