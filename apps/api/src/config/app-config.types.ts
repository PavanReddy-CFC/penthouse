import type { LogLevel } from '@nestjs/common';

/**
 * Validated configuration for this service.
 * Every value originates from an environment variable; nothing here is hardcoded.
 */
export interface AppConfig {
  /** APP_ENV – environment identifier (e.g. dev, test, staging, prod). */
  appEnv: string;
  /** NODE_ENV – Node.js runtime mode. */
  nodeEnv: string;
  /** SERVICE_NAME – identifies this service in logs and health checks. */
  serviceName: string;

  /** HOST – interface to bind to. */
  host: string;
  /** PORT – HTTP listening port. */
  port: number;
  /** API_PREFIX – path prefix for every route (without slashes). */
  apiPrefix: string;
  /** TRUST_PROXY_HOPS – proxies in front of the app (0 locally, 1 on Railway); used for client IPs. */
  trustProxyHops: number;
  /** REQUEST_BODY_LIMIT – max JSON body size, e.g. "1mb". */
  requestBodyLimit: string;
  /** LOG_LEVEL expanded into the list of enabled Nest log levels. */
  logLevels: LogLevel[];

  /** CORS_ORIGIN – allowed origin(s). */
  corsOrigins: string[];
  /** CORS_CREDENTIALS – allow cookies / auth headers cross-origin. */
  corsCredentials: boolean;

  /** DATABASE_URL – PostgreSQL connection string as provided. */
  databaseUrl: string;
  /** DATABASE_URL plus the pool settings below, as Prisma expects them. */
  prismaDatasourceUrl: string;
  database: {
    /** DATABASE_POOL_MAX */
    poolMax: number;
    /** DATABASE_POOL_TIMEOUT_SECONDS */
    poolTimeoutSeconds: number;
    /** DATABASE_CONNECT_TIMEOUT_SECONDS */
    connectTimeoutSeconds: number;
  };

  swagger: {
    /** SWAGGER_ENABLED */
    enabled: boolean;
    /** SWAGGER_PATH (without slashes) */
    path: string;
    /** SWAGGER_TITLE */
    title: string;
    /** SWAGGER_DESCRIPTION */
    description?: string;
    /** SWAGGER_VERSION */
    version: string;
  };

  rateLimit: {
    /** RATE_LIMIT_TTL_SECONDS converted to milliseconds */
    ttlMs: number;
    /** RATE_LIMIT_MAX */
    max: number;
  };

  pagination: {
    /** PAGINATION_DEFAULT_LIMIT */
    defaultLimit: number;
    /** PAGINATION_MAX_LIMIT */
    maxLimit: number;
  };

  /** Redis cache. Disabled when REDIS_URL is empty. */
  redis: {
    /** REDIS_URL */
    url?: string;
    /** REDIS_KEY_PREFIX – prepended to every key this service writes */
    keyPrefix: string;
    /** REDIS_CACHE_TTL_SECONDS – how long cached responses live */
    cacheTtlSeconds: number;
  };

  /** Elasticsearch. Disabled when ELASTICSEARCH_URL is empty. */
  elasticsearch: {
    /** ELASTICSEARCH_URL */
    url?: string;
    /** ELASTICSEARCH_USERNAME (optional) */
    username?: string;
    /** ELASTICSEARCH_PASSWORD (optional) */
    password?: string;
    /** ELASTICSEARCH_INDEX – index that holds the listings */
    index: string;
    /** ELASTICSEARCH_REQUEST_TIMEOUT_MS */
    requestTimeoutMs: number;
  };
}
