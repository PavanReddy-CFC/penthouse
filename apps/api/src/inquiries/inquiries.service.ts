import { Injectable, NotFoundException } from '@nestjs/common';
import { Inquiry, Prisma } from '@prisma/client';
import { LISTING_SUMMARY_SELECT } from '../common/entities/listing-summary.entity';
import { buildMeta, resolvePagination } from '../common/pagination';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { ListInquiriesQueryDto } from './dto/list-inquiries-query.dto';
import { InquiryWithListing, PaginatedInquiries } from './entities/inquiry.entity';

@Injectable()
export class InquiriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async create(dto: CreateInquiryDto): Promise<Inquiry> {
    const listing = await this.prisma.listing.findUnique({ where: { id: dto.listingId }, select: { id: true } });
    if (!listing) throw new NotFoundException(`Listing ${dto.listingId} not found`);

    if (dto.userId) {
      const user = await this.prisma.user.findUnique({ where: { id: dto.userId }, select: { id: true } });
      if (!user) throw new NotFoundException(`User ${dto.userId} not found`);
    }

    return this.prisma.inquiry.create({ data: { ...dto, email: dto.email.toLowerCase() } });
  }

  async findMany(query: ListInquiriesQueryDto): Promise<PaginatedInquiries> {
    const paging = resolvePagination(query, this.config.get('pagination'));
    const where: Prisma.InquiryWhereInput = {
      status: query.status,
      listingId: query.listingId,
      userId: query.userId,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.inquiry.findMany({ where, orderBy: { createdAt: 'desc' }, skip: paging.skip, take: paging.take }),
      this.prisma.inquiry.count({ where }),
    ]);
    return { data, meta: buildMeta(total, paging) };
  }

  async findOne(id: string): Promise<InquiryWithListing> {
    const inquiry = await this.prisma.inquiry.findUnique({
      where: { id },
      include: { listing: { select: LISTING_SUMMARY_SELECT } },
    });
    if (!inquiry) throw new NotFoundException(`Inquiry ${id} not found`);
    return inquiry as unknown as InquiryWithListing;
  }

  async updateStatus(id: string, status: Inquiry['status']): Promise<Inquiry> {
    await this.findOne(id);
    return this.prisma.inquiry.update({ where: { id }, data: { status } });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.inquiry.delete({ where: { id } });
  }
}
