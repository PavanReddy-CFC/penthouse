import { Injectable, NotFoundException } from '@nestjs/common';
import { Listing, ListingStatus, Prisma } from '@prisma/client';
import { buildMeta, resolvePagination } from '../common/pagination';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { ListListingsQueryDto } from './dto/list-listings-query.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingSearchService } from './listing-search.service';
import { ListingStats, PaginatedListings } from './entities/listing.entity';

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly search: ListingSearchService,
  ) {}

  async create(dto: CreateListingDto): Promise<Listing> {
    const listing = await this.prisma.listing.create({ data: { ...dto, mlsNumber: dto.mlsNumber.toUpperCase() } });
    await this.search.indexListing(listing);
    return listing;
  }

  async findMany(query: ListListingsQueryDto): Promise<PaginatedListings> {
    const paging = resolvePagination(query, this.config.get('pagination'));

    const where: Prisma.ListingWhereInput = {
      city: query.city ? { equals: query.city, mode: 'insensitive' } : undefined,
      status: query.status,
      propertyType: query.propertyType,
      bedrooms: query.minBedrooms !== undefined ? { gte: query.minBedrooms } : undefined,
      price:
        query.minPrice !== undefined || query.maxPrice !== undefined
          ? { gte: query.minPrice, lte: query.maxPrice }
          : undefined,
      OR: query.search
        ? [
            { title: { contains: query.search, mode: 'insensitive' } },
            { address: { contains: query.search, mode: 'insensitive' } },
            { mlsNumber: { contains: query.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const orderBy = { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({ where, orderBy, skip: paging.skip, take: paging.take }),
      this.prisma.listing.count({ where }),
    ]);
    return { data: data as unknown as PaginatedListings['data'], meta: buildMeta(total, paging) };
  }

  async findByMlsNumber(mlsNumber: string): Promise<Listing> {
    const listing = await this.prisma.listing.findUnique({ where: { mlsNumber: mlsNumber.toUpperCase() } });
    if (!listing) throw new NotFoundException(`No listing with MLS number ${mlsNumber}`);
    return listing;
  }

  async update(mlsNumber: string, dto: UpdateListingDto): Promise<Listing> {
    const listing = await this.findByMlsNumber(mlsNumber);
    const updated = await this.prisma.listing.update({ where: { id: listing.id }, data: dto });
    await this.search.indexListing(updated);
    return updated;
  }

  async remove(mlsNumber: string): Promise<void> {
    const listing = await this.findByMlsNumber(mlsNumber);
    await this.prisma.listing.delete({ where: { id: listing.id } });
    await this.search.removeListing(listing);
  }

  async stats(): Promise<ListingStats> {
    const [total, statusGroups, cityGroups] = await this.prisma.$transaction([
      this.prisma.listing.count(),
      this.prisma.listing.groupBy({ by: ['status'], orderBy: { status: 'asc' }, _count: { _all: true } }),
      this.prisma.listing.groupBy({
        by: ['city'],
        orderBy: { city: 'asc' },
        _count: { _all: true },
        _avg: { price: true },
      }),
    ]);

    const byStatus = Object.fromEntries(Object.values(ListingStatus).map((s) => [s, 0])) as Record<
      ListingStatus,
      number
    >;
    for (const group of statusGroups) {
      byStatus[group.status] = (group._count as { _all: number })._all;
    }

    const byCity = cityGroups
      .map((group) => ({
        city: group.city,
        count: (group._count as { _all: number })._all,
        averagePrice: group._avg?.price ? group._avg.price.toFixed(2) : null,
      }))
      .sort((a, b) => b.count - a.count);

    return { total, byStatus, byCity };
  }
}
