import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DatabaseModule } from 'src/database/database.module';
import { NotificationProcessor } from './notification.processor';

@Module({
  imports: [DatabaseModule, BullModule.registerQueue({ name: 'notification' })],
  providers: [NotificationProcessor],
  exports: [BullModule],
})
export class NotificationModule {}
