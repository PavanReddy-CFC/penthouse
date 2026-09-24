import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { ListInquiriesQueryDto } from './dto/list-inquiries-query.dto';
import { UpdateInquiryStatusDto } from './dto/update-inquiry-status.dto';
import { InquiryEntity, InquiryWithListing, PaginatedInquiries } from './entities/inquiry.entity';
import { InquiriesService } from './inquiries.service';

/**
 * @swagger
 * tags:
 *   - name: Inquiries
 *     description: Messages from buyers about a listing
 */
@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly inquiries: InquiriesService) {}

  /**
   * @swagger
   * /inquiries:
   *   post:
   *     tags: [Inquiries]
   *     summary: Send an inquiry about a listing
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateInquiry'
   *     responses:
   *       201:
   *         description: Inquiry created with status NEW
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Inquiry'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       404:
   *         description: Listing or user not found
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
  create(@Body() dto: CreateInquiryDto): Promise<InquiryEntity> {
    return this.inquiries.create(dto);
  }

  /**
   * @swagger
   * /inquiries:
   *   get:
   *     tags: [Inquiries]
   *     summary: List inquiries
   *     description: Paginated, newest first.
   *     parameters:
   *       - $ref: '#/components/parameters/Page'
   *       - $ref: '#/components/parameters/Limit'
   *       - in: query
   *         name: status
   *         required: false
   *         schema:
   *           type: string
   *           enum: [NEW, CONTACTED, CLOSED]
   *       - in: query
   *         name: listingId
   *         required: false
   *         description: Only inquiries for this listing
   *         schema:
   *           type: string
   *       - in: query
   *         name: userId
   *         required: false
   *         description: Only inquiries from this user
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: A page of inquiries
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PaginatedInquiries'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   */
  @Get()
  findMany(@Query() query: ListInquiriesQueryDto): Promise<PaginatedInquiries> {
    return this.inquiries.findMany(query);
  }

  /**
   * @swagger
   * /inquiries/{id}:
   *   get:
   *     tags: [Inquiries]
   *     summary: Get an inquiry with its listing
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: The inquiry
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/InquiryWithListing'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   */
  @Get(':id')
  findOne(@Param('id') id: string): Promise<InquiryWithListing> {
    return this.inquiries.findOne(id);
  }

  /**
   * @swagger
   * /inquiries/{id}/status:
   *   patch:
   *     tags: [Inquiries]
   *     summary: Change the status of an inquiry
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
   *             $ref: '#/components/schemas/UpdateInquiryStatus'
   *     responses:
   *       200:
   *         description: The updated inquiry
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Inquiry'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   */
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateInquiryStatusDto): Promise<InquiryEntity> {
    return this.inquiries.updateStatus(id, dto.status);
  }

  /**
   * @swagger
   * /inquiries/{id}:
   *   delete:
   *     tags: [Inquiries]
   *     summary: Delete an inquiry
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       204:
   *         description: Inquiry deleted
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
    return this.inquiries.remove(id);
  }
}
