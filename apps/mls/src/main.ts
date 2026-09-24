import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { loadConfig } from './config/load-config';
import { configureApp } from './setup/configure-app';
import { setupSwagger } from './setup/swagger';

async function bootstrap(): Promise<void> {
  // Validate configuration before anything else so errors are clear.
  const config = loadConfig();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: config.logLevels });
  configureApp(app, app.get(AppConfigService));
  const swaggerOn = setupSwagger(app, config);

  await app.listen(config.port, config.host);

  const logger = new Logger('Bootstrap');
  const base = `http://${config.host}:${config.port}`;
  logger.log(`${config.serviceName} listening on ${base}/${config.apiPrefix} (APP_ENV=${config.appEnv})`);
  if (swaggerOn) logger.log(`Swagger UI: ${base}/${config.swagger.path}`);
}

bootstrap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
