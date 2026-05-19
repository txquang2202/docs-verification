import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard, Roles, RolesGuard } from 'src/shared/guards/guards';
import { UserRole } from 'src/shared/enums/user-roles.enum';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get(':documentId')
  @Roles(UserRole.ADMIN)
  getHistory(@Param('documentId') documentId: string) {
    return this.auditService.getByDocument(documentId);
  }
}
