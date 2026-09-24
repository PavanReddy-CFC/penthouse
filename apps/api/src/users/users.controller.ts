import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginatedUsers, UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: Buyers, agents and admins
 */
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /**
   * @swagger
   * /users:
   *   post:
   *     tags: [Users]
   *     summary: Create a user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateUser'
   *     responses:
   *       201:
   *         description: User created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       409:
   *         $ref: '#/components/responses/Conflict'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   */
  @Post()
  create(@Body() dto: CreateUserDto): Promise<UserEntity> {
    return this.users.create(dto);
  }

  /**
   * @swagger
   * /users:
   *   get:
   *     tags: [Users]
   *     summary: List users
   *     description: Paginated, newest first. Filter by role or search by name/email.
   *     parameters:
   *       - $ref: '#/components/parameters/Page'
   *       - $ref: '#/components/parameters/Limit'
   *       - in: query
   *         name: search
   *         required: false
   *         description: Matches name or email (case-insensitive)
   *         schema:
   *           type: string
   *         example: priya
   *       - in: query
   *         name: role
   *         required: false
   *         schema:
   *           type: string
   *           enum: [BUYER, AGENT, ADMIN]
   *     responses:
   *       200:
   *         description: A page of users
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PaginatedUsers'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   */
  @Get()
  findMany(@Query() query: ListUsersQueryDto): Promise<PaginatedUsers> {
    return this.users.findMany(query);
  }

  /**
   * @swagger
   * /users/{id}:
   *   get:
   *     tags: [Users]
   *     summary: Get a user by id
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         example: clx1a2b3c0000abcd1234efgh
   *     responses:
   *       200:
   *         description: The user
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   */
  @Get(':id')
  findOne(@Param('id') id: string): Promise<UserEntity> {
    return this.users.findOne(id);
  }

  /**
   * @swagger
   * /users/{id}:
   *   patch:
   *     tags: [Users]
   *     summary: Update a user
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateUser'
   *     responses:
   *       200:
   *         description: The updated user
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       409:
   *         $ref: '#/components/responses/Conflict'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<UserEntity> {
    return this.users.update(id, dto);
  }

  /**
   * @swagger
   * /users/{id}:
   *   delete:
   *     tags: [Users]
   *     summary: Delete a user
   *     description: Also removes the user's favorites. Their inquiries are kept without a user link.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       204:
   *         description: User deleted
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.users.remove(id);
  }
}
