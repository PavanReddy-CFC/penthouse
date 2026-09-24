import { Inquiry } from '@prisma/client';
import { Paginated } from '../../common/dto/pagination.dto';
import { ListingSummary } from '../../common/entities/listing-summary.entity';

/**
 * @swagger
 * components:
 *   schemas:
 *     Inquiry:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: clx7q8r9s0000qrst3456uvwx
 *         listingId:
 *           type: string
 *           example: clx4d5e6f0000ijkl5678mnop
 *         userId:
 *           type: string
 *           nullable: true
 *           example: clx1a2b3c0000abcd1234efgh
 *         name:
 *           type: string
 *           example: Rahul Verma
 *         email:
 *           type: string
 *           format: email
 *           example: rahul.verma@example.com
 *         phone:
 *           type: string
 *           nullable: true
 *           example: "+91 91234 56789"
 *         message:
 *           type: string
 *           example: Is the terrace private? I would like to schedule a viewing this weekend.
 *         status:
 *           type: string
 *           enum: [NEW, CONTACTED, CLOSED]
 *           example: NEW
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     InquiryWithListing:
 *       allOf:
 *         - $ref: '#/components/schemas/Inquiry'
 *         - type: object
 *           properties:
 *             listing:
 *               $ref: '#/components/schemas/ListingSummary'
 *
 *     PaginatedInquiries:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Inquiry'
 *         meta:
 *           $ref: '#/components/schemas/PaginationMeta'
 */
export type InquiryEntity = Inquiry;
export type InquiryWithListing = Inquiry & { listing: ListingSummary };
export type PaginatedInquiries = Paginated<Inquiry>;
