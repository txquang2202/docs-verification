import { Injectable } from '@nestjs/common';
import { AuditEvent } from 'src/database/models/audit-event.model';

interface LogParams {
  documentId: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  async log(params: LogParams): Promise<void> {
    await AuditEvent.create({ ...params });
  }

  async getByDocument(documentId: string): Promise<AuditEvent[]> {
    return AuditEvent.findAll({
      where: { documentId },
      order: [['createdAt', 'ASC']],
    });
  }
}
