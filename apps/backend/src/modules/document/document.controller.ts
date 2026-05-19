import {
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from './document.service';
import { JwtAuthGuard, Roles, RolesGuard } from 'src/shared/guards/guards';
import { UserRole } from 'src/shared/enums/user-roles.enum';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentController {
  constructor(private docService: DocumentService) {}

  // Seller: upload document
  @Post('upload')
  @Roles(UserRole.SELLER)
  @UseInterceptors(FileInterceptor('file'))
  upload(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('No file provided');
    return this.docService.upload(req.user.id, file);
  }

  // Seller: check own document status
  @Get('my')
  @Roles(UserRole.SELLER)
  getMyDocument(@Request() req) {
    return this.docService.getBySellerOrThrow(req.user.id);
  }

  // Admin: all documents
  @Get()
  @Roles(UserRole.ADMIN)
  getAllDocuments() {
    return this.docService.getAllDocuments();
  }

  // Admin: pending review queue
  @Get('pending-review')
  @Roles(UserRole.ADMIN)
  getPendingReview() {
    return this.docService.getPendingReview();
  }
}
