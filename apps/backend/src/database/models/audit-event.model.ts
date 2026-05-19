import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  BelongsTo,
  ForeignKey,
  AllowNull,
} from 'sequelize-typescript';
import { Document } from './document.model';

@Table({ tableName: 'audit_events', timestamps: true, updatedAt: false })
export class AuditEvent extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id: string;

  @ForeignKey(() => Document)
  @Column({ type: DataType.UUID, allowNull: false, field: 'document_id' })
  documentId: string;

  @BelongsTo(() => Document, 'document_id')
  document: Document;

  @AllowNull(true)
  @Column({ type: DataType.UUID, field: 'actor_id' })
  actorId: string | null;

  @AllowNull(true)
  @Column({ type: DataType.STRING(20), field: 'actor_role' })
  actorRole: string | null;

  @Column({ type: DataType.STRING(60), allowNull: false })
  action: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(30), field: 'from_status' })
  fromStatus: string | null;

  @AllowNull(true)
  @Column({ type: DataType.STRING(30), field: 'to_status' })
  toStatus: string | null;

  @AllowNull(true)
  @Column({ type: DataType.JSONB })
  metadata: Record<string, any> | null;

  @CreatedAt
  @Column({ field: 'created_at' })
  createdAt: Date;
}
