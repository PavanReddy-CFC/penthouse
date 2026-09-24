import { IsNotEmpty, IsString } from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     AddFavorite:
 *       type: object
 *       required: [listingId]
 *       properties:
 *         listingId:
 *           type: string
 *           description: Id of the listing to save
 *           example: clx4d5e6f0000ijkl5678mnop
 */
export class AddFavoriteDto {
  @IsString()
  @IsNotEmpty()
  listingId: string;
}
