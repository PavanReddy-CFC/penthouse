import { InquiryStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     UpdateInquiryStatus:
 *       type: object
 *       required: [status]
 *       properties:
 *         status:
 *           type: string
 *           enum: [NEW, CONTACTED, CLOSED]
 *           example: CONTACTED
 */
export class UpdateInquiryStatusDto {
  @IsEnum(InquiryStatus)
  status: InquiryStatus;
}
