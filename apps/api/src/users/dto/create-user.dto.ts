import { UserRole } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';

export const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{6,19}$/;

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateUser:
 *       type: object
 *       required: [email, fullName]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: priya.sharma@example.com
 *         fullName:
 *           type: string
 *           minLength: 2
 *           maxLength: 120
 *           example: Priya Sharma
 *         phone:
 *           type: string
 *           example: "+91 98765 43210"
 *         role:
 *           type: string
 *           enum: [BUYER, AGENT, ADMIN]
 *           default: BUYER
 *
 *     UpdateUser:
 *       type: object
 *       description: Send only the fields you want to change
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         fullName:
 *           type: string
 *           minLength: 2
 *           maxLength: 120
 *         phone:
 *           type: string
 *         role:
 *           type: string
 *           enum: [BUYER, AGENT, ADMIN]
 *       example:
 *         fullName: Priya S. Sharma
 *         phone: "+91 90000 11111"
 */
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(2, 120)
  fullName: string;

  @IsOptional()
  @Matches(PHONE_PATTERN, { message: 'phone must be a valid phone number' })
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
