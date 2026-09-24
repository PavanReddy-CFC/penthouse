import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { buildMeta, resolvePagination } from '../common/pagination';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginatedUsers } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  create(dto: CreateUserDto): Promise<User> {
    return this.prisma.user.create({ data: { ...dto, email: dto.email.toLowerCase() } });
  }

  async findMany(query: ListUsersQueryDto): Promise<PaginatedUsers> {
    const paging = resolvePagination(query, this.config.get('pagination'));
    const where: Prisma.UserWhereInput = {
      role: query.role,
      OR: query.search
        ? [
            { fullName: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: paging.skip, take: paging.take }),
      this.prisma.user.count({ where }),
    ]);
    return { data, meta: buildMeta(total, paging) };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { ...dto, email: dto.email?.toLowerCase() },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
  }
}
