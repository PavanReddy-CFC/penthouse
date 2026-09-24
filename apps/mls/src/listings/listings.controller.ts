import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateListingDto } from './dto/create-listing.dto';
import { SearchListingsQueryDto } from './dto/search-listings-query.dto';
import { ListListingsQueryDto } from './dto/list-listings-query.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingEntity, ListingStats, PaginatedListings } from './entities/listing.entity';
import { ListingSearchService, ReindexResult, SearchResult } from './listing-search.service';
import { ListingsService } from './listings.service';

/**
 * @swagger
 * tags:
 *   - name: Listings
 *     description: Properties on the market (read from PostgreSQL)
 *   - name: Search
 *     description: Full-text search with Elasticsearch, cached in Redis
 */
@Controller('listings')
export class ListingsController {
  constructor(
    private readonly listings: ListingsService,
    private readonly listingSearch: ListingSearchService,
  ) {}

  /**
   * @swagger
   * /listings:
   *   post:
   *     tags: [Listings]
   *     summary: Create a listing
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateListing'
   *     responses:
   *       201:
   *         description: Listing created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Listing'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       409:
   *         description: The MLS number already exists
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
  create(@Body() dto: CreateListingDto): Promise<ListingEntity> {
    return this.listings.create(dto);
  }

  /**
   * @swagger
   * /listings:
   *   get:
   *     tags: [Listings]
   *     summary: List listings (filter, sort, paginate)
   *     description: Reads straight from PostgreSQL. All filters are optional and can be combined. For full-text search with typo tolerance, use /listings/search.
   *     parameters:
   *       - $ref: '#/components/parameters/Page'
   *       - $ref: '#/components/parameters/Limit'
   *       - in: query
   *         name: city
   *         required: false
   *         description: Exact city (case-insensitive)
   *         schema:
   *           type: string
   *         example: Hyderabad
   *       - in: query
   *         name: status
   *         required: false
   *         schema:
   *           type: string
   *           enum: [ACTIVE, PENDING, SOLD, WITHDRAWN]
   *       - in: query
   *         name: propertyType
   *         required: false
   *         schema:
   *           type: string
   *           enum: [PENTHOUSE, APARTMENT, VILLA, TOWNHOUSE, PLOT]
   *       - in: query
   *         name: minPrice
   *         required: false
   *         schema:
   *           type: number
   *           minimum: 0
   *         example: 10000000
   *       - in: query
   *         name: maxPrice
   *         required: false
   *         schema:
   *           type: number
   *           minimum: 0
   *         example: 80000000
   *       - in: query
   *         name: minBedrooms
   *         required: false
   *         schema:
   *           type: integer
   *           minimum: 0
   *         example: 3
   *       - in: query
   *         name: search
   *         required: false
   *         description: Matches title, address or MLS number
   *         schema:
   *           type: string
   *         example: terrace
   *       - in: query
   *         name: sortBy
   *         required: false
   *         schema:
   *           type: string
   *           enum: [createdAt, price, bedrooms, areaSqft]
   *           default: createdAt
   *       - in: query
   *         name: sortOrder
   *         required: false
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *     responses:
   *       200:
   *         description: A page of matching listings
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PaginatedListings'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   */
  @Get()
  findMany(@Query() query: ListListingsQueryDto): Promise<PaginatedListings> {
    return this.listings.findMany(query);
  }

  /**
   * @swagger
   * /listings/stats:
   *   get:
   *     tags: [Listings]
   *     summary: Listing statistics
   *     description: Counts by status, plus count and average price for each city.
   *     responses:
   *       200:
   *         description: Statistics
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ListingStats'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   */
  @Get('stats')
  stats(): Promise<ListingStats> {
    return this.listings.stats();
  }

  /**
   * @swagger
   * /listings/search:
   *   get:
   *     tags: [Search]
   *     summary: Full-text listing search (Elasticsearch, cached in Redis)
   *     description: |
   *       1. Looks for the same query in Redis. If found, returns it with `source: redis-cache`.
   *       2. Otherwise searches Elasticsearch, stores the result in Redis for
   *          REDIS_CACHE_TTL_SECONDS, and returns it with `source: elasticsearch`.
   *
   *       `q` matches title, description, address and city, tolerates typos, and an exact
   *       MLS number ranks first. The cache is cleared whenever a listing changes.
   *     parameters:
   *       - in: query
   *         name: q
   *         required: false
   *         description: Free text, e.g. "terrace banjara" or an MLS number
   *         schema:
   *           type: string
   *         example: terrace
   *       - in: query
   *         name: city
   *         required: false
   *         description: Exact city (case-insensitive)
   *         schema:
   *           type: string
   *         example: Hyderabad
   *       - in: query
   *         name: status
   *         required: false
   *         schema:
   *           type: string
   *           enum: [ACTIVE, PENDING, SOLD, WITHDRAWN]
   *       - in: query
   *         name: propertyType
   *         required: false
   *         schema:
   *           type: string
   *           enum: [PENTHOUSE, APARTMENT, VILLA, TOWNHOUSE, PLOT]
   *       - in: query
   *         name: minPrice
   *         required: false
   *         schema:
   *           type: number
   *           minimum: 0
   *       - in: query
   *         name: maxPrice
   *         required: false
   *         schema:
   *           type: number
   *           minimum: 0
   *       - in: query
   *         name: minBedrooms
   *         required: false
   *         schema:
   *           type: integer
   *           minimum: 0
   *       - in: query
   *         name: sortBy
   *         required: false
   *         description: Defaults to relevance when q is given, otherwise createdAt
   *         schema:
   *           type: string
   *           enum: [relevance, createdAt, price, bedrooms, areaSqft]
   *       - in: query
   *         name: sortOrder
   *         required: false
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *       - $ref: '#/components/parameters/Page'
   *       - $ref: '#/components/parameters/Limit'
   *     responses:
   *       200:
   *         description: Matching listings and where they came from
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SearchResult'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   *       503:
   *         description: Elasticsearch is not configured, not reachable, or the index is still being created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *             example:
   *               statusCode: 503
   *               message: "Search is unavailable: Elasticsearch is not reachable."
   *               error: Service Unavailable
   */
  @Get('search')
  search(@Query() query: SearchListingsQueryDto): Promise<SearchResult> {
    return this.listingSearch.search(query);
  }

  /**
   * @swagger
   * /listings/search/reindex:
   *   post:
   *     tags: [Search]
   *     summary: Rebuild the search index from the database
   *     description: |
   *       Deletes and recreates the Elasticsearch index, loads every listing from PostgreSQL,
   *       and clears the Redis search cache. Normally not needed: the index is filled on
   *       startup and updated whenever a listing changes. Use it after changing data
   *       directly in the database (for example after `npm run db:seed`).
   *     responses:
   *       200:
   *         description: Index rebuilt
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ReindexResult'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   *       503:
   *         description: Elasticsearch or the database is not reachable
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  @Post('search/reindex')
  @HttpCode(HttpStatus.OK)
  reindex(): Promise<ReindexResult> {
    return this.listingSearch.reindexAll();
  }

  /**
   * @swagger
   * /listings/{mlsNumber}:
   *   get:
   *     tags: [Listings]
   *     summary: Get a listing by MLS number
   *     parameters:
   *       - in: path
   *         name: mlsNumber
   *         required: true
   *         schema:
   *           type: string
   *         example: HYD-2026-0001
   *     responses:
   *       200:
   *         description: The listing
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Listing'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   */
  @Get(':mlsNumber')
  findOne(@Param('mlsNumber') mlsNumber: string): Promise<ListingEntity> {
    return this.listings.findByMlsNumber(mlsNumber);
  }

  /**
   * @swagger
   * /listings/{mlsNumber}:
   *   patch:
   *     tags: [Listings]
   *     summary: Update a listing
   *     description: For example, change the price or mark it as sold.
   *     parameters:
   *       - in: path
   *         name: mlsNumber
   *         required: true
   *         schema:
   *           type: string
   *         example: HYD-2026-0001
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateListing'
   *     responses:
   *       200:
   *         description: The updated listing
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Listing'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   */
  @Patch(':mlsNumber')
  update(@Param('mlsNumber') mlsNumber: string, @Body() dto: UpdateListingDto): Promise<ListingEntity> {
    return this.listings.update(mlsNumber, dto);
  }

  /**
   * @swagger
   * /listings/{mlsNumber}:
   *   delete:
   *     tags: [Listings]
   *     summary: Delete a listing
   *     description: Also removes favorites and inquiries for this listing.
   *     parameters:
   *       - in: path
   *         name: mlsNumber
   *         required: true
   *         schema:
   *           type: string
   *         example: HYD-2026-0001
   *     responses:
   *       204:
   *         description: Listing deleted
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   */
  @Delete(':mlsNumber')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('mlsNumber') mlsNumber: string): Promise<void> {
    return this.listings.remove(mlsNumber);
  }
}
