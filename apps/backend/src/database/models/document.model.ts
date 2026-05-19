import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  BelongsTo,
  ForeignKey,
  HasMany,
  Default,
  AllowNull,
} from 'sequelize-typescript';
import { User } from './user.model';
import { VerificationAttempt } from './verification-attempt.model';
import { AuditEvent } from './audit-event.model';

export enum DocumentStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  INCONCLUSIVE = 'INCONCLUSIVE',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
}

@Table({ tableName: 'documents', timestamps: true })
export class Document extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false, field: 'seller_id' })
  sellerId: string;

  @BelongsTo(() => User, 'seller_id')
  seller: User;

  @Column({ type: DataType.STRING(500), allowNull: false, field: 'file_path' })
  filePath: string;

  @Column({ type: DataType.STRING(255), allowNull: false, field: 'file_name' })
  fileName: string;

  @Column({ type: DataType.INTEGER, allowNull: false, field: 'file_size' })
  fileSize: number;

  @Column({ type: DataType.STRING(100), allowNull: false, field: 'mime_type' })
  mimeType: string;

  @Default(DocumentStatus.PENDING_VERIFICATION)
  @Column({
    type: DataType.ENUM(...Object.values(DocumentStatus)),
    allowNull: false,
  })
  status: DocumentStatus;

  @AllowNull(true)
  @Column({ type: DataType.STRING(500), field: 'rejection_reason' })
  rejectionReason: string | null;

  // Optimistic locking
  @Default(0)
  @Column({ type: DataType.INTEGER, allowNull: false })
  version: number;

  @CreatedAt
  @Column({ field: 'uploaded_at' })
  uploadedAt: Date;

  @UpdatedAt
  @Column({ field: 'updated_at' })
  updatedAt: Date;

  @HasMany(() => VerificationAttempt, 'documentId')
  attempts: VerificationAttempt[];

  @HasMany(() => AuditEvent, 'documentId')
  auditEvents: AuditEvent[];
}
