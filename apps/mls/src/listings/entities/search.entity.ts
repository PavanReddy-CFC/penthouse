/*
 * Documentation for the search endpoints. The TypeScript types live in
 * listing-search.service.ts (ListingDocument, SearchResult, ReindexResult).
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ListingDocument:
 *       type: object
 *       description: A listing as stored in the search index. Prices are numbers here.
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
 *         propertyType:
 *           type: string
 *           enum: [PENTHOUSE, APARTMENT, VILLA, TOWNHOUSE, PLOT]
 *         address:
 *           type: string
 *           example: Road No. 12, Banjara Hills
 *         city:
 *           type: string
 *           example: Hyderabad
 *         price:
 *           type: number
 *           example: 45000000
 *         bedrooms:
 *           type: integer
 *           nullable: true
 *           example: 4
 *         bathrooms:
 *           type: number
 *           nullable: true
 *           example: 4.5
 *         areaSqft:
 *           type: integer
 *           nullable: true
 *           example: 5200
 *         status:
 *           type: string
 *           enum: [ACTIVE, PENDING, SOLD, WITHDRAWN]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     SearchResult:
 *       type: object
 *       properties:
 *         source:
 *           type: string
 *           enum: [redis-cache, elasticsearch]
 *           description: Where this response came from
 *           example: elasticsearch
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ListingDocument'
 *         meta:
 *           $ref: '#/components/schemas/PaginationMeta'
 *
 *     ReindexResult:
 *       type: object
 *       properties:
 *         index:
 *           type: string
 *           example: penthouselife_listings
 *         indexed:
 *           type: integer
 *           example: 6
 *         tookMs:
 *           type: integer
 *           example: 412
 */
export {};
