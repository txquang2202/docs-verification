import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/database/models/user.model';

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

@Processor('notification')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST', 'smtp.ethereal.email'),
      port: config.get<number>('SMTP_PORT', 587),
      auth: {
        user: config.get('SMTP_USER', ''),
        pass: config.get('SMTP_PASS', ''),
      },
    });
  }

  @Process('send-email')
  async handleSendEmail(
    job: Job<{ documentId: string; sellerId: string; outcome: string }>,
  ) {
    const { sellerId, outcome, documentId } = job.data;

    const seller = await User.findByPk(sellerId);
    if (!seller) {
      this.logger.warn(`Seller ${sellerId} not found, skipping notification`);
      return;
    }

    const subject =
      outcome === 'approved'
        ? '✅ Your document has been approved'
        : '❌ Your document verification result';

    const text =
      outcome === 'approved'
        ? `Congratulations! Your business document has been verified and approved. You can now list products on our marketplace.`
        : `We were unable to verify your business document. Please contact support for assistance. Reference: ${documentId}`;

    try {
      const info = await this.transporter.sendMail({
        from: this.config.get('SMTP_FROM', 'noreply@marketplace.com'),
        to: seller.email,
        subject,
        text,
      });
      this.logger.log(
        `Email sent to ${seller.email} — outcome: ${outcome} — preview: ${nodemailer.getTestMessageUrl(info)}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to send email to ${seller.email}: ${getErrorMessage(err)}`,
      );
      throw err;
    }
  }
}
