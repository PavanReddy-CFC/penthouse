/**
 * Browser-safe configuration.
 *
 * Next.js inlines NEXT_PUBLIC_* variables at build time, and only when they are
 * referenced literally as `process.env.NEXT_PUBLIC_...`. That is why each one is
 * written out below instead of being read through a dynamic key.
 *
 * This file (together with server-config.ts) is the only place in the web app
 * that reads process.env.
 */
export interface PublicConfig {
  /** NEXT_PUBLIC_APP_NAME – product name shown in the UI. */
  appName: string;
  /** NEXT_PUBLIC_API_URL – base URL of the Main API (including its API_PREFIX). */
  apiUrl: string;
  /** NEXT_PUBLIC_MLS_API_URL – base URL of the MLS API (including its API_PREFIX). */
  mlsApiUrl: string;
  /** NEXT_PUBLIC_API_DOCS_URL – Swagger UI of the Main API. */
  apiDocsUrl: string;
  /** NEXT_PUBLIC_MLS_API_DOCS_URL – Swagger UI of the MLS API. */
  mlsApiDocsUrl: string;
  /** NEXT_PUBLIC_API_TIMEOUT_MS – abort backend requests after this many ms. */
  apiTimeoutMs: number;
}

export const publicConfig: PublicConfig = Object.freeze({
  appName: (process.env.NEXT_PUBLIC_APP_NAME ?? '').trim(),
  apiUrl: cleanUrl(process.env.NEXT_PUBLIC_API_URL),
  mlsApiUrl: cleanUrl(process.env.NEXT_PUBLIC_MLS_API_URL),
  apiDocsUrl: cleanUrl(process.env.NEXT_PUBLIC_API_DOCS_URL),
  mlsApiDocsUrl: cleanUrl(process.env.NEXT_PUBLIC_MLS_API_DOCS_URL),
  apiTimeoutMs: Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? ''),
});

/** Names of public variables that are missing or invalid. */
export function missingPublicConfig(): string[] {
  const missing: string[] = [];
  if (!publicConfig.appName) missing.push('NEXT_PUBLIC_APP_NAME');
  if (!publicConfig.apiUrl) missing.push('NEXT_PUBLIC_API_URL');
  if (!publicConfig.mlsApiUrl) missing.push('NEXT_PUBLIC_MLS_API_URL');
  if (!publicConfig.apiDocsUrl) missing.push('NEXT_PUBLIC_API_DOCS_URL');
  if (!publicConfig.mlsApiDocsUrl) missing.push('NEXT_PUBLIC_MLS_API_DOCS_URL');
  if (!Number.isFinite(publicConfig.apiTimeoutMs) || publicConfig.apiTimeoutMs <= 0) {
    missing.push('NEXT_PUBLIC_API_TIMEOUT_MS');
  }
  return missing;
}

function cleanUrl(value: string | undefined): string {
  return (value ?? '').trim().replace(/\/+$/, '');
}
