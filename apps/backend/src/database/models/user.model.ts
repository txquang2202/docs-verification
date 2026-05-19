import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  HasOne,
  Default,
  Unique,
} from 'sequelize-typescript';
import { Document } from './document.model';

export enum UserRole {
  SELLER = 'SELLER',
  ADMIN = 'ADMIN',
}

@Table({ tableName: 'users', timestamps: true, updatedAt: false })
export class User extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id: string;

  @Unique
  @Column({ type: DataType.STRING(255), allowNull: false })
  email: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  password: string;

  @Default(UserRole.SELLER)
  @Column({ type: DataType.ENUM(...Object.values(UserRole)), allowNull: false })
  role: UserRole;

  @CreatedAt
  createdAt: Date;

  @HasOne(() => Document, 'sellerId')
  document: Document;
}
