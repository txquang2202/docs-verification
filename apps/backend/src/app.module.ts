import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { DocumentModule } from './modules/document/document.module';
import { VerificationModule } from './modules/verification/verification.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AuditModule } from './modules/audit/audit.module';
import { MockModule } from './modules/mock/mock.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT'),
          tls: config.get('NODE_ENV') === 'production' ? {} : undefined,
        },
      }),
    }),

    AuthModule,
    DocumentModule,
    VerificationModule,
    NotificationModule,
    AuditModule,
    MockModule,
  ],
})
export class AppModule {}
