/**
 * Writes the OpenAPI document (built from the @swagger comments) to a JSON
 * file without starting the server. Usage: node dist/openapi-export.js <output-file>
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { loadConfig } from './config/load-config';
import { buildOpenApiDocument } from './setup/swagger';

function exportSpec(): void {
  const target = process.argv[2];
  if (!target) throw new Error('Usage: node dist/openapi-export.js <output-file>');

  const document = buildOpenApiDocument(loadConfig());
  const out = resolve(target);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(document, null, 2) + '\n');
  console.log(`OpenAPI document written to ${out}`);
}

try {
  exportSpec();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
