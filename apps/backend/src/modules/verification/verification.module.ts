import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { VerificationProcessor } from './verification.processor';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { DatabaseModule } from 'src/database/database.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({ name: 'verification' }),
    BullModule.registerQueue({ name: 'notification' }),
    HttpModule,
    AuditModule,
    NotificationModule,
  ],
  providers: [VerificationProcessor, VerificationService],
  controllers: [VerificationController],
})
export class VerificationModule {}
