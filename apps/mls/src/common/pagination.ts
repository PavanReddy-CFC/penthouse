import { AppConfig } from '../config/app-config.types';
import { PaginationMeta, PaginationQueryDto } from './dto/pagination.dto';

export interface ResolvedPagination {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export function resolvePagination(
  query: PaginationQueryDto,
  settings: AppConfig['pagination'],
): ResolvedPagination {
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? settings.defaultLimit, settings.maxLimit);
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function buildMeta(total: number, { page, limit }: ResolvedPagination): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
