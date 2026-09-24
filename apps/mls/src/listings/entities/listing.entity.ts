import { Listing, ListingStatus } from '@prisma/client';
import { Paginated } from '../../common/dto/pagination.dto';

/**
 * @swagger
 * components:
 *   schemas:
 *     Listing:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: clx4d5e6f0000ijkl5678mnop
 *         mlsNumber:
 *           type: string
 *           example: HYD-2026-0001
 *         title:
 *           type: string
 *           example: Skyline penthouse with private terrace
 *         description:
 *           type: string
 *           nullable: true
 *           example: Top-floor residence with 360° city views.
 *         propertyType:
 *           type: string
 *           enum: [PENTHOUSE, APARTMENT, VILLA, TOWNHOUSE, PLOT]
 *           example: PENTHOUSE
 *         address:
 *           type: string
 *           example: Road No. 12, Banjara Hills
 *         city:
 *           type: string
 *           example: Hyderabad
 *         price:
 *           type: string
 *           description: Decimal serialized as a string
 *           example: "45000000.00"
 *         bedrooms:
 *           type: integer
 *           nullable: true
 *           example: 4
 *         bathrooms:
 *           type: string
 *           nullable: true
 *           description: Decimal serialized as a string
 *           example: "4.5"
 *         areaSqft:
 *           type: integer
 *           nullable: true
 *           example: 5200
 *         status:
 *           type: string
 *           enum: [ACTIVE, PENDING, SOLD, WITHDRAWN]
 *           example: ACTIVE
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     PaginatedListings:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Listing'
 *         meta:
 *           $ref: '#/components/schemas/PaginationMeta'
 *
 *     ListingStats:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 18
 *         byStatus:
 *           type: object
 *           properties:
 *             ACTIVE:
 *               type: integer
 *               example: 10
 *             PENDING:
 *               type: integer
 *               example: 2
 *             SOLD:
 *               type: integer
 *               example: 5
 *             WITHDRAWN:
 *               type: integer
 *               example: 1
 *         byCity:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               city:
 *                 type: string
 *                 example: Hyderabad
 *               count:
 *                 type: integer
 *                 example: 12
 *               averagePrice:
 *                 type: string
 *                 nullable: true
 *                 example: "38500000.00"
 */
export type ListingEntity = Listing;
export type PaginatedListings = Paginated<Listing>;

export interface ListingStats {
  total: number;
  byStatus: Record<ListingStatus, number>;
  byCity: { city: string; count: number; averagePrice: string | null }[];
}
