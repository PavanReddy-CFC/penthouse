import { ListingSummary } from '../../common/entities/listing-summary.entity';

/**
 * @swagger
 * components:
 *   schemas:
 *     Favorite:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: clx9z8y7x0000wxyz9876vuts
 *         userId:
 *           type: string
 *           example: clx1a2b3c0000abcd1234efgh
 *         listingId:
 *           type: string
 *           example: clx4d5e6f0000ijkl5678mnop
 *         createdAt:
 *           type: string
 *           format: date-time
 *         listing:
 *           $ref: '#/components/schemas/ListingSummary'
 */
export interface FavoriteEntity {
  id: string;
  userId: string;
  listingId: string;
  createdAt: Date;
  listing: ListingSummary;
}
