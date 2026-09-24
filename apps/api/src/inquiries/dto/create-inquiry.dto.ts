import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';
import { PHONE_PATTERN } from '../../users/dto/create-user.dto';

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateInquiry:
 *       type: object
 *       required: [listingId, name, email, message]
 *       properties:
 *         listingId:
 *           type: string
 *           description: Listing the inquiry is about
 *           example: clx4d5e6f0000ijkl5678mnop
 *         userId:
 *           type: string
 *           description: Registered user sending the inquiry, if any
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 120
 *           example: Rahul Verma
 *         email:
 *           type: string
 *           format: email
 *           example: rahul.verma@example.com
 *         phone:
 *           type: string
 *           example: "+91 91234 56789"
 *         message:
 *           type: string
 *           minLength: 10
 *           maxLength: 2000
 *           example: Is the terrace private? I would like to schedule a viewing this weekend.
 */
export class CreateInquiryDto {
  @IsString()
  @IsNotEmpty()
  listingId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  userId?: string;

  @IsString()
  @Length(2, 120)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @Matches(PHONE_PATTERN, { message: 'phone must be a valid phone number' })
  phone?: string;

  @IsString()
  @Length(10, 2000)
  message: string;
}
