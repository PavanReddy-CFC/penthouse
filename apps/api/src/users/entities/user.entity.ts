import { User } from '@prisma/client';
import { Paginated } from '../../common/dto/pagination.dto';

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: clx1a2b3c0000abcd1234efgh
 *         email:
 *           type: string
 *           format: email
 *           example: priya.sharma@example.com
 *         fullName:
 *           type: string
 *           example: Priya Sharma
 *         phone:
 *           type: string
 *           nullable: true
 *           example: "+91 98765 43210"
 *         role:
 *           type: string
 *           enum: [BUYER, AGENT, ADMIN]
 *           example: BUYER
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     PaginatedUsers:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/User'
 *         meta:
 *           $ref: '#/components/schemas/PaginationMeta'
 */
export type UserEntity = User;
export type PaginatedUsers = Paginated<User>;
