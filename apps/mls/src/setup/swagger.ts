import { resolve } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import type { Request, Response } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import * as swaggerUi from 'swagger-ui-express';
import { AppConfig } from '../config/app-config.types';

/**
 * Where the @swagger comment blocks live. swagger-jsdoc reads them straight
 * from the TypeScript source files, next to the code they describe.
 * Forward slashes are required by the glob library, including on Windows.
 */
const SOURCE_GLOB = resolve(__dirname, '..', '..', 'src', '**', '*.ts').replace(/\\/g, '/');

/** Builds the OpenAPI document from every @swagger comment in src/. */
export function buildOpenApiDocument(config: AppConfig): object {
  const { title, version, description } = config.swagger;

  return swaggerJsdoc({
    failOnErrors: true,
    definition: {
      openapi: '3.0.0',
      info: { title, version, description },
      // Relative URL: "Try it out" calls the same host and port that serves the docs.
      servers: [{ url: `/${config.apiPrefix}`, description: `${config.appEnv} (this server)` }],
    },
    apis: [SOURCE_GLOB],
  });
}

/**
 * Serves Swagger UI at /SWAGGER_PATH and the raw OpenAPI JSON at /SWAGGER_PATH.json.
 * Returns false when SWAGGER_ENABLED=false.
 */
export function setupSwagger(app: INestApplication, config: AppConfig): boolean {
  const swagger = config.swagger;
  if (!swagger.enabled) return false;

  const spec = buildOpenApiDocument(config);
  const docsPath = `/${swagger.path}`;

  app.use(`${docsPath}.json`, (_req: Request, res: Response) => {
    res.json(spec);
  });
  app.use(
    docsPath,
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customSiteTitle: swagger.title,
      swaggerOptions: {
        displayRequestDuration: true,
        filter: true,
        docExpansion: 'list',
        tryItOutEnabled: true,
      },
    }),
  );
  return true;
}
