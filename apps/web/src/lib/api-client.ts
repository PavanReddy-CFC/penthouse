import { publicConfig } from '@/config/public-config';

export type ServiceKey = 'api' | 'mls';

const baseUrls: Record<ServiceKey, string> = {
  api: publicConfig.apiUrl,
  mls: publicConfig.mlsApiUrl,
};

const serviceLabels: Record<ServiceKey, string> = {
  api: 'Main API',
  mls: 'MLS API',
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * All backend calls go through here, so base URLs and the timeout come from
 * configuration only.
 */
export async function getJson<T>(service: ServiceKey, path: string, init?: RequestInit): Promise<T> {
  const base = baseUrls[service];
  if (!base) throw new ApiError(`The URL for the ${serviceLabels[service]} is not configured.`);

  const timeout = publicConfig.apiTimeoutMs > 0 ? publicConfig.apiTimeoutMs : undefined;

  let response: Response;
  try {
    response = await fetch(`${base}${path.startsWith('/') ? path : `/${path}`}`, {
      ...init,
      signal: init?.signal ?? (timeout ? AbortSignal.timeout(timeout) : undefined),
      headers: { Accept: 'application/json', ...init?.headers },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError(`${serviceLabels[service]} did not respond within ${timeout} ms.`);
    }
    throw new ApiError(`Could not reach ${base}. Check that the service is running.`);
  }

  if (!response.ok) {
    let detail = '';
    try {
      const body = (await response.json()) as { message?: string | string[] };
      detail = Array.isArray(body.message) ? body.message.join('; ') : (body.message ?? '');
    } catch {
      /* body was not JSON */
    }
    throw new ApiError(detail || `Request failed with status ${response.status}.`, response.status);
  }
  return (await response.json()) as T;
}

// ---- Response types (mirror the Swagger schemas) ---------------------------

export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  appEnv: string;
  database: 'up' | 'down';
  /** Only reported by services that use Redis / Elasticsearch. */
  redis?: 'up' | 'down' | 'disabled';
  elasticsearch?: 'up' | 'down' | 'disabled';
  uptimeSeconds: number;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export type ListingStatus = 'ACTIVE' | 'PENDING' | 'SOLD' | 'WITHDRAWN';
export type PropertyType = 'PENTHOUSE' | 'APARTMENT' | 'VILLA' | 'TOWNHOUSE' | 'PLOT';

export interface Listing {
  id: string;
  mlsNumber: string;
  title: string;
  description: string | null;
  propertyType: PropertyType;
  address: string;
  city: string;
  price: string;
  bedrooms: number | null;
  bathrooms: string | null;
  areaSqft: number | null;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
}
