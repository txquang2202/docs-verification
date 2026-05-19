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

@Table({
  tableName: 'verification_attempts',
  timestamps: true,
  updatedAt: false,
})
export class VerificationAttempt extends Model {
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

  @Column({ type: DataType.INTEGER, allowNull: false, field: 'attempt_number' })
  attemptNumber: number;

  @AllowNull(true)
  @Column({ type: DataType.STRING(30), field: 'raw_result' })
  rawResult: string | null;

  @AllowNull(true)
  @Column({ type: DataType.JSONB, field: 'raw_response' })
  rawResponse: Record<string, any> | null;

  @AllowNull(true)
  @Column({ type: DataType.TEXT, field: 'error_message' })
  errorMessage: string | null;

  @AllowNull(true)
  @Column({ type: DataType.INTEGER, field: 'duration_ms' })
  durationMs: number | null;

  @CreatedAt
  @Column({ field: 'attempted_at' })
  attemptedAt: Date;
}
