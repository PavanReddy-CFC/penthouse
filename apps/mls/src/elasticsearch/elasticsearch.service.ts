import { Client } from '@elastic/elasticsearch';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import type { DependencyStatus } from '../redis/redis.service';

/**
 * Owns the Elasticsearch client.
 * Disabled when ELASTICSEARCH_URL is empty. Never blocks startup.
 */
@Injectable()
export class ElasticsearchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Elasticsearch');
  private _client?: Client;

  constructor(private readonly config: AppConfigService) {}

  onModuleInit(): void {
    const es = this.config.get('elasticsearch');
    if (!es.url) {
      this.logger.log('ELASTICSEARCH_URL is empty: search is disabled.');
      return;
    }

    this._client = new Client({
      node: es.url,
      auth: es.username ? { username: es.username, password: es.password ?? '' } : undefined,
      requestTimeout: es.requestTimeoutMs,
      maxRetries: 1,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this._client?.close();
  }

  get enabled(): boolean {
    return this._client !== undefined;
  }

  /** The client. Only call when `enabled` is true. */
  get client(): Client {
    if (!this._client) throw new Error('Elasticsearch is disabled (ELASTICSEARCH_URL is empty)');
    return this._client;
  }

  get index(): string {
    return this.config.get('elasticsearch').index;
  }

  async status(): Promise<DependencyStatus> {
    if (!this._client) return 'disabled';
    try {
      return (await this._client.ping()) ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }
}
