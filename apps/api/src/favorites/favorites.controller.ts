import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { AddFavoriteDto } from './dto/add-favorite.dto';
import { FavoriteEntity } from './entities/favorite.entity';
import { FavoritesService } from './favorites.service';

/**
 * @swagger
 * tags:
 *   - name: Favorites
 *     description: Listings a user has saved
 */
@Controller('users/:userId/favorites')
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  /**
   * @swagger
   * /users/{userId}/favorites:
   *   get:
   *     tags: [Favorites]
   *     summary: List a user's saved listings
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Saved listings, newest first
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Favorite'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   */
  @Get()
  findForUser(@Param('userId') userId: string): Promise<FavoriteEntity[]> {
    return this.favorites.findForUser(userId);
  }

  /**
   * @swagger
   * /users/{userId}/favorites:
   *   post:
   *     tags: [Favorites]
   *     summary: Save a listing to a user's favorites
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/AddFavorite'
   *     responses:
   *       201:
   *         description: Listing saved
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Favorite'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       404:
   *         description: User or listing not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       409:
   *         description: The listing is already saved
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   */
  @Post()
  add(@Param('userId') userId: string, @Body() dto: AddFavoriteDto): Promise<FavoriteEntity> {
    return this.favorites.add(userId, dto.listingId);
  }

  /**
   * @swagger
   * /users/{userId}/favorites/{listingId}:
   *   delete:
   *     tags: [Favorites]
   *     summary: Remove a listing from a user's favorites
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: listingId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       204:
   *         description: Removed
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   */
  @Delete(':listingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('userId') userId: string, @Param('listingId') listingId: string): Promise<void> {
    return this.favorites.remove(userId, listingId);
  }
}
