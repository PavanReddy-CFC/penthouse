import type { LogLevel } from '@nestjs/common';
import { AppConfig } from './app-config.types';
import { ENV_SCOPE } from './env-scope';

type RawEnv = Record<string, string | undefined>;

const LOG_LEVEL_ORDER: LogLevel[] = ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'];

export class ConfigValidationError extends Error {
  constructor(problems: string[]) {
    super(
      'Invalid environment configuration:\n' +
        problems.map((p) => `  - ${p}`).join('\n') +
        '\nCheck the .env file in the project root (see .env.example).',
    );
    this.name = 'ConfigValidationError';
  }
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '');
}

/**
 * The ONLY place in this service that reads process.env.
 * Everything else consumes configuration through AppConfigService.
 *
 * All apps share one .env file. For every setting this service first looks for
 * a scoped variable (e.g. API_PORT) and then falls back to the shared one (PORT).
 */
export function loadConfig(env: RawEnv = process.env, scope: string = ENV_SCOPE): AppConfig {
  const problems: string[] = [];

  /** Human-readable name used in error messages, e.g. "API_PORT (or PORT)". */
  const label = (key: string): string => `${scope}_${key} (or ${key})`;

  const optional = (key: string): string | undefined => {
    const scoped = env[`${scope}_${key}`]?.trim();
    if (scoped) return scoped;
    const shared = env[key]?.trim();
    return shared ? shared : undefined;
  };

  const str = (key: string): string => {
    const value = optional(key);
    if (!value) problems.push(`${label(key)} is required but is missing or empty`);
    return value ?? '';
  };

  const int = (key: string, min: number, max: number): number => {
    const raw = str(key);
    const value = Number(raw);
    if (raw && (!Number.isInteger(value) || value < min || value > max)) {
      problems.push(`${label(key)} must be an integer between ${min} and ${max} (got "${raw}")`);
    }
    return value;
  };

  const bool = (key: string): boolean => {
    const raw = str(key).toLowerCase();
    if (raw && raw !== 'true' && raw !== 'false') {
      problems.push(`${label(key)} must be "true" or "false" (got "${raw}")`);
    }
    return raw === 'true';
  };

  const url = (key: string, value: string | undefined): void => {
    if (value && !isValidUrl(value)) problems.push(`${label(key)} is not a valid URL`);
  };

  // --- Environment -------------------------------------------------------
  const appEnv = str('APP_ENV');
  const nodeEnv = str('NODE_ENV');
  const serviceName = str('SERVICE_NAME');

  // --- HTTP server -------------------------------------------------------
  const host = str('HOST');
  const port = int('PORT', 1, 65535);
  const apiPrefix = trimSlashes(str('API_PREFIX'));
  const trustProxyHops = int('TRUST_PROXY_HOPS', 0, 10);
  const requestBodyLimit = str('REQUEST_BODY_LIMIT');
  if (requestBodyLimit && !/^\d+(b|kb|mb)$/i.test(requestBodyLimit)) {
    problems.push(`${label('REQUEST_BODY_LIMIT')} must look like 100kb or 1mb (got "${requestBodyLimit}")`);
  }

  const rawLogLevel = str('LOG_LEVEL').toLowerCase() as LogLevel;
  const logLevelIndex = LOG_LEVEL_ORDER.indexOf(rawLogLevel);
  if (rawLogLevel && logLevelIndex === -1) {
    problems.push(
      `${label('LOG_LEVEL')} must be one of ${LOG_LEVEL_ORDER.slice(1).join(', ')} (got "${rawLogLevel}")`,
    );
  }
  const logLevels = LOG_LEVEL_ORDER.slice(0, Math.max(logLevelIndex, 0) + 1);

  // --- CORS --------------------------------------------------------------
  const corsOrigins = str('CORS_ORIGIN')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  for (const origin of corsOrigins) {
    if (!isValidUrl(origin)) problems.push(`${label('CORS_ORIGIN')} contains an invalid URL: "${origin}"`);
  }
  const corsCredentials = bool('CORS_CREDENTIALS');

  // --- Database ----------------------------------------------------------
  const databaseUrl = str('DATABASE_URL');
  url('DATABASE_URL', databaseUrl);
  const database = {
    poolMax: int('DATABASE_POOL_MAX', 1, 1000),
    poolTimeoutSeconds: int('DATABASE_POOL_TIMEOUT_SECONDS', 0, 3600),
    connectTimeoutSeconds: int('DATABASE_CONNECT_TIMEOUT_SECONDS', 0, 3600),
  };

  // --- Swagger -----------------------------------------------------------
  const swagger = {
    enabled: bool('SWAGGER_ENABLED'),
    path: trimSlashes(str('SWAGGER_PATH')),
    title: str('SWAGGER_TITLE'),
    description: optional('SWAGGER_DESCRIPTION'),
    version: str('SWAGGER_VERSION'),
  };

  // --- Rate limiting -----------------------------------------------------
  const rateLimit = {
    ttlMs: int('RATE_LIMIT_TTL_SECONDS', 1, 86400) * 1000,
    max: int('RATE_LIMIT_MAX', 1, 1_000_000),
  };

  // --- Pagination --------------------------------------------------------
  const pagination = {
    defaultLimit: int('PAGINATION_DEFAULT_LIMIT', 1, 10000),
    maxLimit: int('PAGINATION_MAX_LIMIT', 1, 10000),
  };
  if (pagination.defaultLimit > pagination.maxLimit) {
    problems.push('PAGINATION_DEFAULT_LIMIT must not be greater than PAGINATION_MAX_LIMIT');
  }

  // --- Redis (optional) -------------------------------------------------
  // The other Redis settings are only required once REDIS_URL is set.
  const redisUrl = optional('REDIS_URL');
  url('REDIS_URL', redisUrl);
  const redis = {
    url: redisUrl,
    keyPrefix: redisUrl ? str('REDIS_KEY_PREFIX') : (optional('REDIS_KEY_PREFIX') ?? ''),
    cacheTtlSeconds: redisUrl ? int('REDIS_CACHE_TTL_SECONDS', 1, 604800) : 0,
  };

  // --- Elasticsearch (optional) -----------------------------------------
  // The other Elasticsearch settings are only required once ELASTICSEARCH_URL is set.
  const elasticsearchUrl = optional('ELASTICSEARCH_URL');
  url('ELASTICSEARCH_URL', elasticsearchUrl);
  const elasticsearch = {
    url: elasticsearchUrl,
    username: optional('ELASTICSEARCH_USERNAME'),
    password: optional('ELASTICSEARCH_PASSWORD'),
    index: elasticsearchUrl ? str('ELASTICSEARCH_INDEX').toLowerCase() : '',
    requestTimeoutMs: elasticsearchUrl ? int('ELASTICSEARCH_REQUEST_TIMEOUT_MS', 100, 600000) : 0,
  };
  if (elasticsearch.username && !elasticsearch.password) {
    problems.push(`${label('ELASTICSEARCH_PASSWORD')} is required when ELASTICSEARCH_USERNAME is set`);
  }

  if (problems.length > 0) throw new ConfigValidationError(problems);

  return Object.freeze({
    appEnv,
    nodeEnv,
    serviceName,
    host,
    port,
    apiPrefix,
    trustProxyHops,
    requestBodyLimit,
    logLevels,
    corsOrigins,
    corsCredentials,
    databaseUrl,
    prismaDatasourceUrl: withPoolSettings(databaseUrl, database),
    database,
    swagger,
    rateLimit,
    pagination,
    redis,
    elasticsearch,
  });
}

/** Adds Prisma pool parameters to the URL unless they are already present. */
function withPoolSettings(databaseUrl: string, db: AppConfig['database']): string {
  const parsed = new URL(databaseUrl);
  const params: Record<string, number> = {
    connection_limit: db.poolMax,
    pool_timeout: db.poolTimeoutSeconds,
    connect_timeout: db.connectTimeoutSeconds,
  };
  for (const [key, value] of Object.entries(params)) {
    if (!parsed.searchParams.has(key)) parsed.searchParams.set(key, String(value));
  }
  return parsed.toString();
}
