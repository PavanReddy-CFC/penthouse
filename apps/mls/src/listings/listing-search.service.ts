import { createHash } from 'node:crypto';
import { errors, estypes } from '@elastic/elasticsearch';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Listing } from '@prisma/client';
import { PaginationMeta } from '../common/dto/pagination.dto';
import { buildMeta, resolvePagination } from '../common/pagination';
import { AppConfigService } from '../config/app-config.service';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SearchListingsQueryDto } from './dto/search-listings-query.dto';

/** A listing as stored in Elasticsearch (numbers instead of decimal strings). */
export interface ListingDocument {
  id: string;
  mlsNumber: string;
  title: string;
  description: string | null;
  propertyType: string;
  address: string;
  city: string;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqft: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  source: 'redis-cache' | 'elasticsearch';
  data: ListingDocument[];
  meta: PaginationMeta;
}

export interface ReindexResult {
  index: string;
  indexed: number;
  tookMs: number;
}

/** How often to retry preparing the index while Elasticsearch is unreachable. */
const RETRY_INTERVAL_MS = 15_000;
const REINDEX_BATCH_SIZE = 500;

const INDEX_SETTINGS: estypes.IndicesIndexSettings = {
  analysis: {
    normalizer: {
      lowercase_normalizer: { type: 'custom', filter: ['lowercase', 'asciifolding'] },
    },
  },
};

const INDEX_MAPPINGS: estypes.MappingTypeMapping = {
  dynamic: 'strict',
  properties: {
    id: { type: 'keyword' },
    mlsNumber: { type: 'keyword', normalizer: 'lowercase_normalizer' },
    title: { type: 'text' },
    description: { type: 'text' },
    propertyType: { type: 'keyword' },
    address: { type: 'text' },
    city: { type: 'keyword', normalizer: 'lowercase_normalizer' },
    price: { type: 'double' },
    bedrooms: { type: 'integer' },
    bathrooms: { type: 'float' },
    areaSqft: { type: 'integer' },
    status: { type: 'keyword' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
  },
};

/**
 * Full-text listing search:
 *   1. check Redis  -> "redis-cache"
 *   2. otherwise query Elasticsearch -> "elasticsearch", then store the result in Redis
 *
 * The index is created automatically and filled from PostgreSQL, and it is kept
 * in sync whenever a listing is created, updated or deleted.
 */
@Injectable()
export class ListingSearchService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger('ListingSearch');
  private retryTimer?: NodeJS.Timeout;
  private reportedDown = false;

  constructor(
    private readonly es: ElasticsearchService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (this.es.enabled) void this.prepareIndex();
  }

  onModuleDestroy(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  async search(query: SearchListingsQueryDto): Promise<SearchResult> {
    this.assertEnabled();
    const paging = resolvePagination(query, this.config.get('pagination'));

    const cacheKey = this.redis.key('listings', 'search', hashQuery({ ...query, page: paging.page, limit: paging.limit }));
    const cached = await this.redis.getJson<Omit<SearchResult, 'source'>>(cacheKey);
    if (cached) {
      this.logger.debug(`CACHE HIT ${cacheKey}`);
      return { source: 'redis-cache', ...cached };
    }
    this.logger.debug(`CACHE MISS ${cacheKey}`);

    let response: estypes.SearchResponse<ListingDocument>;
    try {
      response = await this.es.client.search<ListingDocument>({
        index: this.es.index,
        from: paging.skip,
        size: paging.take,
        track_total_hits: true,
        query: buildQuery(query),
        sort: buildSort(query),
      });
    } catch (error) {
      throw this.toServiceUnavailable(error);
    }

    const total =
      typeof response.hits.total === 'number' ? response.hits.total : (response.hits.total?.value ?? 0);
    const result = {
      data: response.hits.hits.map((hit) => hit._source as ListingDocument),
      meta: buildMeta(total, paging),
    };

    await this.redis.setJson(cacheKey, result);
    return { source: 'elasticsearch', ...result };
  }

  // ---------------------------------------------------------------------------
  // Keeping the index in sync
  // ---------------------------------------------------------------------------

  /** Adds or replaces one listing in the index. Never throws. */
  async indexListing(listing: Listing): Promise<void> {
    await this.invalidateCache();
    if (!this.es.enabled) return;
    try {
      await this.es.client.index({
        index: this.es.index,
        id: listing.id,
        document: toDocument(listing),
        refresh: 'wait_for',
      });
    } catch (error) {
      this.logger.warn(
        `Could not index listing ${listing.mlsNumber}: ${describe(error)}. ` +
          'Run POST /listings/search/reindex once Elasticsearch is available.',
      );
    }
  }

  /** Removes one listing from the index. Never throws. */
  async removeListing(listing: Listing): Promise<void> {
    await this.invalidateCache();
    if (!this.es.enabled) return;
    try {
      await this.es.client.delete({ index: this.es.index, id: listing.id, refresh: 'wait_for' });
    } catch (error) {
      if (error instanceof errors.ResponseError && error.statusCode === 404) return;
      this.logger.warn(`Could not remove listing ${listing.mlsNumber} from the index: ${describe(error)}`);
    }
  }

  /** Rebuilds the index from PostgreSQL. */
  async reindexAll(): Promise<ReindexResult> {
    this.assertEnabled();
    const started = Date.now();
    const client = this.es.client;
    const index = this.es.index;

    // Make sure the database is readable BEFORE dropping the current index,
    // so a database outage never leaves search empty.
    await this.prisma.listing.count();

    try {
      await client.indices.delete({ index, ignore_unavailable: true });
      await this.createIndex();
    } catch (error) {
      throw this.toServiceUnavailable(error);
    }

    let indexed = 0;
    let cursor: string | undefined;
    for (;;) {
      const batch = await this.prisma.listing.findMany({
        orderBy: { id: 'asc' },
        take: REINDEX_BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (batch.length === 0) break;

      let response: estypes.BulkResponse;
      try {
        response = await client.bulk({
          operations: batch.flatMap((listing) => [{ index: { _index: index, _id: listing.id } }, toDocument(listing)]),
        });
      } catch (error) {
        throw this.toServiceUnavailable(error);
      }
      if (response.errors) {
        const first = response.items.find((item) => item.index?.error)?.index?.error;
        throw new ServiceUnavailableException(`Elasticsearch rejected some listings: ${first?.reason ?? 'unknown error'}`);
      }

      indexed += batch.length;
      cursor = batch[batch.length - 1].id;
    }

    try {
      await client.indices.refresh({ index });
    } catch (error) {
      throw this.toServiceUnavailable(error);
    }
    await this.invalidateCache();

    const result = { index, indexed, tookMs: Date.now() - started };
    this.logger.log(`Reindexed ${indexed} listings into "${index}" in ${result.tookMs} ms`);
    return result;
  }

  // ---------------------------------------------------------------------------
  // Startup: create the index and fill it if needed
  // ---------------------------------------------------------------------------

  private async prepareIndex(): Promise<void> {
    let created: boolean;
    try {
      created = await this.ensureIndex();
    } catch (error) {
      if (!this.reportedDown) {
        this.logger.warn(
          `Elasticsearch is not reachable (${describe(error)}). Search is unavailable; ` +
            `retrying every ${RETRY_INTERVAL_MS / 1000} s.`,
        );
        this.reportedDown = true;
      }
      this.retryTimer = setTimeout(() => void this.prepareIndex(), RETRY_INTERVAL_MS);
      this.retryTimer.unref();
      return;
    }

    if (this.reportedDown) this.logger.log('Elasticsearch is reachable again.');
    this.reportedDown = false;
    if (created) this.logger.log(`Created index "${this.es.index}"`);

    // Fill the index from PostgreSQL when it is new or out of step.
    try {
      const [dbCount, indexCount] = await Promise.all([
        this.prisma.listing.count(),
        this.es.client.count({ index: this.es.index }).then((r) => r.count),
      ]);
      if (created || dbCount !== indexCount) {
        this.logger.log(`Index has ${indexCount} listings, database has ${dbCount}: reindexing...`);
        await this.reindexAll();
      } else {
        this.logger.log(`Index "${this.es.index}" is up to date (${indexCount} listings).`);
      }
    } catch (error) {
      this.logger.warn(
        `Could not sync the index from the database (${describe(error)}). ` +
          'Run POST /listings/search/reindex once the database is available.',
      );
    }
  }

  /** Creates the index if it does not exist. Returns true when it was created. */
  private async ensureIndex(): Promise<boolean> {
    if (await this.es.client.indices.exists({ index: this.es.index })) return false;
    await this.createIndex();
    return true;
  }

  private async createIndex(): Promise<void> {
    try {
      await this.es.client.indices.create({ index: this.es.index, settings: INDEX_SETTINGS, mappings: INDEX_MAPPINGS });
    } catch (error) {
      // Another instance may have created it at the same moment.
      if (error instanceof errors.ResponseError && error.body?.error?.type === 'resource_already_exists_exception') return;
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async invalidateCache(): Promise<void> {
    await this.redis.deleteByPrefix(this.redis.key('listings', 'search', ''));
  }

  private assertEnabled(): void {
    if (!this.es.enabled) {
      throw new ServiceUnavailableException('Search is not configured. Set ELASTICSEARCH_URL in the .env file.');
    }
  }

  private toServiceUnavailable(error: unknown): ServiceUnavailableException {
    if (error instanceof errors.ResponseError && error.body?.error?.type === 'index_not_found_exception') {
      void this.prepareIndex();
      return new ServiceUnavailableException('The search index is being created. Try again in a few seconds.');
    }
    this.logger.warn(`Elasticsearch request failed: ${describe(error)}`);
    return new ServiceUnavailableException('Search is unavailable: Elasticsearch is not reachable.');
  }
}

// -----------------------------------------------------------------------------

function toDocument(listing: Listing): ListingDocument {
  return {
    id: listing.id,
    mlsNumber: listing.mlsNumber,
    title: listing.title,
    description: listing.description,
    propertyType: listing.propertyType,
    address: listing.address,
    city: listing.city,
    price: Number(listing.price),
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms === null ? null : Number(listing.bathrooms),
    areaSqft: listing.areaSqft,
    status: listing.status,
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
  };
}

function buildQuery(query: SearchListingsQueryDto): estypes.QueryDslQueryContainer {
  const filter: estypes.QueryDslQueryContainer[] = [];
  if (query.city) filter.push({ term: { city: query.city } });
  if (query.status) filter.push({ term: { status: query.status } });
  if (query.propertyType) filter.push({ term: { propertyType: query.propertyType } });
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.push({ range: { price: { gte: query.minPrice, lte: query.maxPrice } } });
  }
  if (query.minBedrooms !== undefined) filter.push({ range: { bedrooms: { gte: query.minBedrooms } } });

  const text = query.q?.trim();
  const must: estypes.QueryDslQueryContainer[] = text
    ? [
        {
          multi_match: {
            query: text,
            fields: ['title^3', 'description', 'address^2', 'city^2'],
            fuzziness: 'AUTO',
          },
        },
      ]
    : [{ match_all: {} }];

  const should: estypes.QueryDslQueryContainer[] = text ? [{ term: { mlsNumber: { value: text, boost: 10 } } }] : [];

  return { bool: { must, filter, should } };
}

function buildSort(query: SearchListingsQueryDto): estypes.SortCombinations[] {
  const sortBy = query.sortBy ?? (query.q?.trim() ? 'relevance' : 'createdAt');
  const order = query.sortOrder ?? 'desc';
  if (sortBy === 'relevance') return ['_score', { createdAt: { order: 'desc' } }];
  return [{ [sortBy]: { order, missing: '_last' } }, { id: { order: 'asc' } }];
}

/** Stable cache key for a query: same filters in any order -> same key. */
function hashQuery(query: Record<string, unknown>): string {
  const normalized = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => [key, typeof value === 'string' ? value.trim().toLowerCase() : value] as const)
    .sort(([a], [b]) => a.localeCompare(b));
  return createHash('sha1').update(JSON.stringify(normalized)).digest('hex');
}

function describe(error: unknown): string {
  if (error instanceof errors.ResponseError) return `${error.statusCode} ${error.body?.error?.type ?? error.message}`;
  if (error instanceof Error) {
    // Prisma messages span several lines; the last line says what went wrong.
    const lines = (error.message || error.name).split('\n').map((l) => l.trim()).filter(Boolean);
    return lines[lines.length - 1] ?? error.name;
  }
  return String(error);
}
