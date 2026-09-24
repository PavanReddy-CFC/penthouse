import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaExceptionFilter } from '../common/filters/prisma-exception.filter';
import { AppConfigService } from '../config/app-config.service';

/**
 * Applies all HTTP-level settings. Used by main.ts and by the OpenAPI export
 * script so both produce exactly the same routes.
 */
export function configureApp(app: NestExpressApplication, config: AppConfigService): void {
  app.setGlobalPrefix(config.get('apiPrefix'));

  // Behind a proxy (e.g. Railway), read the real client IP from X-Forwarded-For
  // so rate limiting applies per visitor instead of to everyone at once.
  const hops = config.get('trustProxyHops');
  if (hops > 0) app.set('trust proxy', hops);

  app.useBodyParser('json', { limit: config.get('requestBodyLimit') });
  app.useBodyParser('urlencoded', { limit: config.get('requestBodyLimit'), extended: true });

  app.enableCors({
    origin: config.get('corsOrigins'),
    credentials: config.get('corsCredentials'),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.enableShutdownHooks();
}
