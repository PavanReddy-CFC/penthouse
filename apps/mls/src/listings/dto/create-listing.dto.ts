import { ListingStatus, PropertyType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateListing:
 *       type: object
 *       required: [mlsNumber, title, address, city, price]
 *       properties:
 *         mlsNumber:
 *           type: string
 *           description: Unique MLS number. Letters, digits and dashes, 3–30 characters.
 *           example: HYD-2026-0005
 *         title:
 *           type: string
 *           minLength: 3
 *           maxLength: 200
 *           example: Rooftop penthouse with infinity pool
 *         description:
 *           type: string
 *           maxLength: 5000
 *           example: Private rooftop with pool and panoramic views of the lake.
 *         propertyType:
 *           type: string
 *           enum: [PENTHOUSE, APARTMENT, VILLA, TOWNHOUSE, PLOT]
 *           default: PENTHOUSE
 *         address:
 *           type: string
 *           minLength: 3
 *           maxLength: 300
 *           example: Hitech City Road, Madhapur
 *         city:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           example: Hyderabad
 *         price:
 *           type: number
 *           description: Asking price, up to 2 decimal places
 *           example: 52000000
 *         bedrooms:
 *           type: integer
 *           minimum: 0
 *           maximum: 50
 *           example: 4
 *         bathrooms:
 *           type: number
 *           minimum: 0
 *           maximum: 50
 *           description: Up to 1 decimal place
 *           example: 4.5
 *         areaSqft:
 *           type: integer
 *           minimum: 1
 *           example: 5600
 *         status:
 *           type: string
 *           enum: [ACTIVE, PENDING, SOLD, WITHDRAWN]
 *           default: ACTIVE
 *
 *     UpdateListing:
 *       type: object
 *       description: Send only the fields you want to change. The MLS number cannot be changed.
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         propertyType:
 *           type: string
 *           enum: [PENTHOUSE, APARTMENT, VILLA, TOWNHOUSE, PLOT]
 *         address:
 *           type: string
 *         city:
 *           type: string
 *         price:
 *           type: number
 *         bedrooms:
 *           type: integer
 *         bathrooms:
 *           type: number
 *         areaSqft:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [ACTIVE, PENDING, SOLD, WITHDRAWN]
 *       example:
 *         price: 43500000
 *         status: PENDING
 */
export class CreateListingDto {
  @Matches(/^[A-Za-z0-9-]{3,30}$/, { message: 'mlsNumber may contain only letters, digits and dashes (3–30 chars)' })
  mlsNumber: string;

  @IsString()
  @Length(3, 200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @IsString()
  @Length(3, 300)
  address: string;

  @IsString()
  @Length(2, 100)
  city: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  bedrooms?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(50)
  bathrooms?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  areaSqft?: number;

  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;
}
