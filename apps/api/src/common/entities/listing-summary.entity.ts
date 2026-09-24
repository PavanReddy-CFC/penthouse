import { ListingStatus, PropertyType } from '@prisma/client';

/**
 * @swagger
 * components:
 *   schemas:
 *     ListingSummary:
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
 *         city:
 *           type: string
 *           example: Hyderabad
 *         price:
 *           type: string
 *           description: Decimal serialized as a string
 *           example: "45000000.00"
 *         propertyType:
 *           type: string
 *           enum: [PENTHOUSE, APARTMENT, VILLA, TOWNHOUSE, PLOT]
 *         status:
 *           type: string
 *           enum: [ACTIVE, PENDING, SOLD, WITHDRAWN]
 */
export interface ListingSummary {
  id: string;
  mlsNumber: string;
  title: string;
  city: string;
  price: string;
  propertyType: PropertyType;
  status: ListingStatus;
}

export const LISTING_SUMMARY_SELECT = {
  id: true,
  mlsNumber: true,
  title: true,
  city: true,
  price: true,
  propertyType: true,
  status: true,
} as const;
