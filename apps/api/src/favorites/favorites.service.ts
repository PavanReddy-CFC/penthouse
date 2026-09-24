import { Injectable, NotFoundException } from '@nestjs/common';
import { LISTING_SUMMARY_SELECT } from '../common/entities/listing-summary.entity';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { FavoriteEntity } from './entities/favorite.entity';

@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async findForUser(userId: string): Promise<FavoriteEntity[]> {
    await this.users.findOne(userId);
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { listing: { select: LISTING_SUMMARY_SELECT } },
    });
    return favorites as unknown as FavoriteEntity[];
  }

  async add(userId: string, listingId: string): Promise<FavoriteEntity> {
    await this.users.findOne(userId);
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId }, select: { id: true } });
    if (!listing) throw new NotFoundException(`Listing ${listingId} not found`);

    const favorite = await this.prisma.favorite.create({
      data: { userId, listingId },
      include: { listing: { select: LISTING_SUMMARY_SELECT } },
    });
    return favorite as unknown as FavoriteEntity;
  }

  async remove(userId: string, listingId: string): Promise<void> {
    const { count } = await this.prisma.favorite.deleteMany({ where: { userId, listingId } });
    if (count === 0) throw new NotFoundException('This listing is not in the user’s favorites');
  }
}
