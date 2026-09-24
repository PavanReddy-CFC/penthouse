/**
 * Server-only configuration, read at request time.
 * Import this only from Server Components, route handlers or server actions —
 * never from a 'use client' file.
 */
export interface ServerConfig {
  /** APP_ENV – environment identifier (e.g. dev, test, staging, prod). */
  appEnv: string;
  /** NODE_ENV – Node.js / Next.js runtime mode. */
  nodeEnv: string;
}

export function getServerConfig(): ServerConfig {
  return {
    appEnv: (process.env.APP_ENV ?? '').trim(),
    nodeEnv: (process.env.NODE_ENV ?? '').trim(),
  };
}
