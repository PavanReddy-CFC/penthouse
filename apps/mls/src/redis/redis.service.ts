import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';
import { AppConfigService } from '../config/app-config.service';

type RedisClient = ReturnType<typeof createClient>;

export type DependencyStatus = 'up' | 'down' | 'disabled';

/**
 * Small JSON cache on top of Redis.
 *
 * - Disabled when REDIS_URL is empty: every read is a miss, writes do nothing.
 * - Never blocks startup or requests: if Redis is down, reads are misses and
 *   the client reconnects in the background. State changes are logged once.
 * - Every key is prefixed with REDIS_KEY_PREFIX.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Redis');
  private client?: RedisClient;
  private reportedDown = false;

  constructor(private readonly config: AppConfigService) {}

  onModuleInit(): void {
    const { url } = this.config.get('redis');
    if (!url) {
      this.logger.log('REDIS_URL is empty: caching is disabled.');
      return;
    }

    this.client = createClient({
      url,
      socket: {
        connectTimeout: 5000,
        // Keep retrying: 0.5 s, 1 s, 1.5 s ... up to every 10 s.
        reconnectStrategy: (retries) => Math.min((retries + 1) * 500, 10000),
      },
    });

    this.client.on('ready', () => {
      this.reportedDown = false;
      this.logger.log(`Connected to ${redact(url)}`);
    });
    this.client.on('error', (error: Error) => {
      if (this.reportedDown) return;
      this.reportedDown = true;
      this.logger.warn(
        `Not reachable at ${redact(url)} (${error.message || error.name}). ` +
          'Caching is paused and will resume automatically when Redis is back.',
      );
    });

    // Connect in the background so the service starts even if Redis is down.
    this.client.connect().catch(() => undefined);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) await this.client.close();
  }

  status(): DependencyStatus {
    if (!this.client) return 'disabled';
    return this.client.isReady ? 'up' : 'down';
  }

  /** Full key including REDIS_KEY_PREFIX. */
  key(...parts: string[]): string {
    return this.config.get('redis').keyPrefix + parts.join(':');
  }

  /** Returns the cached value, or null on a miss / when Redis is unavailable. */
  async getJson<T>(key: string): Promise<T | null> {
    if (!this.client?.isReady) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
      this.logger.warn(`GET ${key} failed: ${(error as Error).message}`);
      return null;
    }
  }

  /** Stores a value for REDIS_CACHE_TTL_SECONDS (or the given TTL). */
  async setJson(key: string, value: unknown, ttlSeconds = this.config.get('redis').cacheTtlSeconds): Promise<void> {
    if (!this.client?.isReady) return;
    try {
      await this.client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch (error) {
      this.logger.warn(`SET ${key} failed: ${(error as Error).message}`);
    }
  }

  /** Deletes every key that starts with the given (already prefixed) key prefix. */
  async deleteByPrefix(prefix: string): Promise<number> {
    if (!this.client?.isReady) return 0;
    let deleted = 0;
    try {
      for await (const keys of this.client.scanIterator({ MATCH: `${prefix}*`, COUNT: 200 })) {
        if (keys.length > 0) deleted += await this.client.del(keys);
      }
    } catch (error) {
      this.logger.warn(`Cache invalidation for ${prefix}* failed: ${(error as Error).message}`);
    }
    return deleted;
  }
}

/** Hides the password in log messages. */
function redact(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '****';
    return parsed.toString();
  } catch {
    return url;
  }
}
