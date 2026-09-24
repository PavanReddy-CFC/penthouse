// Runs the Next.js CLI with PORT taken from WEB_PORT, so the web app can share
// the single root .env file with the backends (which use API_PORT / MLS_PORT).
// Usage: node scripts/next.mjs <dev|build|start> [...next options]
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');

const env = { ...process.env };
if (env.WEB_PORT) env.PORT = env.WEB_PORT;

const child = spawn(process.execPath, [nextBin, ...process.argv.slice(2)], { stdio: 'inherit', env });
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
