import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { VerificationService } from './verification.service';
import { JwtAuthGuard, Roles, RolesGuard } from 'src/shared/guards/guards';
import { UserRole } from 'src/shared/enums/user-roles.enum';

class AdminReviewDto {
  @IsEnum(['approved', 'rejected'])
  decision: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  reason?: string;

  @IsNumber()
  version: number;
}

@Controller('verifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VerificationController {
  constructor(private verificationService: VerificationService) {}

  @Post(':documentId/review')
  @Roles(UserRole.ADMIN)
  review(
    @Param('documentId') documentId: string,
    @Body() dto: AdminReviewDto,
    @Request() req,
  ) {
    return this.verificationService.adminReview(
      documentId,
      req.user.id,
      dto.decision,
      dto.reason,
      dto.version,
    );
  }

  @Get(':documentId/attempts')
  @Roles(UserRole.ADMIN)
  getAttempts(@Param('documentId') documentId: string) {
    return this.verificationService.getAttempts(documentId);
  }
}
