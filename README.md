# PenthouseLife

A monorepo with three applications that share one configuration principle:
**the source code is identical in every environment; only environment variables change.**

```
APPLICATION CODE  ->  CENTRALIZED CONFIGURATION  ->  ENVIRONMENT VARIABLES (dev / test / staging / prod)
```

| App         | Path       | Stack                         | Local URL                  | Swagger UI                  |
|-------------|------------|-------------------------------|----------------------------|-----------------------------|
| Web         | `apps/web` | Next.js 15, React 19          | http://localhost:3000      | –                               |
| Main API    | `apps/api` | NestJS 11, Prisma 6, Swagger | http://localhost:4000/api  | http://localhost:4000/api-docs |
| MLS service | `apps/mls` | NestJS 11, Prisma 6, Swagger | http://localhost:4020/api  | http://localhost:4020/api-docs |

## Quick start

Requirements: Node.js 20+, and **Docker Desktop** for PostgreSQL, Redis and
Elasticsearch (or install those three yourself, see below).

```bash
npm install
npm run services:up   # starts PostgreSQL, Redis, Elasticsearch (first run downloads ~1.5 GB)
npm run db:migrate    # creates the tables (name the migration e.g. "init")
npm run db:seed       # sample listings, users, a favorite and an inquiry
npm run dev           # starts web, api and mls
```

Open http://localhost:3000. With everything running, the MLS service shows
"database connected" and "Redis connected, Elasticsearch connected".

`npm run services:status` shows whether the three containers are healthy;
`npm run services:down` stops them (data is kept).

If `.env` is missing (e.g. after a fresh git clone), copy the template first:

```bash
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env
```

**Without Docker:** every dependency is optional at startup. Without
PostgreSQL, data endpoints return 503. Without Redis, search works but nothing
is cached. Without Elasticsearch, `/listings/search` returns 503; everything
else works. Empty `REDIS_URL` or `ELASTICSEARCH_URL` turns that feature off.
Each service logs one warning when a dependency is down and reconnects
automatically when it comes back.

> **Upgrading from v0.1?** The schema changed. Run `npm run db:reset` once.
> It drops and recreates the dev database.

## Search with Elasticsearch and Redis

`GET /api/listings/search` on the MLS service (port 4020) works like this:

1. The query (all filters, lower-cased, in any order) becomes a Redis key.
   If it is cached, the result is returned with `"source": "redis-cache"`.
2. Otherwise Elasticsearch is queried, the result is stored in Redis for
   `REDIS_CACHE_TTL_SECONDS`, and returned with `"source": "elasticsearch"`.

`q` searches title, description, address and city with typo tolerance;
an exact MLS number ranks first. `city`, `status`, `propertyType`, `minPrice`,
`maxPrice` and `minBedrooms` filter the results. Try it at
http://localhost:4020/api-docs under **Search**.

**Keeping the index in sync**

- On startup the MLS service creates the index (`ELASTICSEARCH_INDEX`) if
  needed and fills it from PostgreSQL when the counts differ.
- Creating, updating or deleting a listing through the API updates the index
  immediately and clears the cached search results.
- After changing data directly in the database (e.g. `npm run db:seed`),
  restart the MLS service or call `POST /api/listings/search/reindex`.
  Reindexing checks the database first, so an outage never empties search.

`GET /api/listings` still reads straight from PostgreSQL and is unaffected by
Redis or Elasticsearch.

## API documentation (Swagger / OpenAPI)

Each backend serves Swagger UI, where you can read and try every endpoint:

- **Main API:** http://localhost:4000/api-docs (JSON: `/api-docs.json`)
- **MLS API:** http://localhost:4020/api-docs (JSON: `/api-docs.json`)
- **As files:** `npm run openapi:export` writes `docs/openapi/api.openapi.json`
  and `docs/openapi/mls.openapi.json` (a current copy is included). Import them
  into Postman, Insomnia, or a client-code generator.

The documentation is written as **`@swagger` comment blocks** (OpenAPI 3.0 YAML)
directly above the code they describe, built with `swagger-jsdoc` and served
with `swagger-ui-express`. Set `SWAGGER_ENABLED=false` to turn it off.

Where things live:

| What | Where |
|---|---|
| Swagger setup | `src/setup/swagger.ts` |
| Shared schemas (`Error`, `PaginationMeta`, `Health`), `page`/`limit` parameters, error responses | `src/docs/common.docs.ts` |
| Request/response schemas | above each DTO or entity class, e.g. `users/dto/create-user.dto.ts` |
| Endpoint docs | above each controller method |
| Tags | above each controller class |

### Documenting a new endpoint

Add a block above the controller method. Paths are written **without** the
`/api` prefix; it comes from the `servers` entry. Reuse shared pieces with `$ref`:

```ts
/**
 * @swagger
 * /listings/{mlsNumber}/photos:
 *   get:
 *     tags: [Listings]
 *     summary: List the photos of a listing
 *     parameters:
 *       - in: path
 *         name: mlsNumber
 *         required: true
 *         schema:
 *           type: string
 *         example: HYD-2026-0001
 *     responses:
 *       200:
 *         description: Photos of the listing
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
@Get(':mlsNumber/photos')
findPhotos(@Param('mlsNumber') mlsNumber: string) { ... }
```

New schemas go in a `components: schemas:` block, usually above the DTO class.
Indentation matters (it is YAML): a mistake stops the service at startup with
the file and line of the problem.

## Endpoints

All routes are under `API_PREFIX` (default `api`).

**Main API** (port 4000)

| Method | Path                                   | Description                              |
|--------|----------------------------------------|------------------------------------------|
| GET    | `/api`                                 | Check whether the API is running         |
| GET    | `/api/health`                          | Service and database health              |
| POST   | `/api/users`                           | Create a user                            |
| GET    | `/api/users`                           | List users (`page`, `limit`, `search`, `role`) |
| GET    | `/api/users/:id`                       | Get a user                               |
| PATCH  | `/api/users/:id`                       | Update a user                            |
| DELETE | `/api/users/:id`                       | Delete a user                            |
| GET    | `/api/users/:userId/favorites`         | A user's saved listings                  |
| POST   | `/api/users/:userId/favorites`         | Save a listing (`{ listingId }`)         |
| DELETE | `/api/users/:userId/favorites/:listingId` | Remove a saved listing                |
| POST   | `/api/inquiries`                       | Send an inquiry about a listing          |
| GET    | `/api/inquiries`                       | List inquiries (`status`, `listingId`, `userId`, paging) |
| GET    | `/api/inquiries/:id`                   | Get an inquiry with its listing          |
| PATCH  | `/api/inquiries/:id/status`            | Change status (NEW, CONTACTED, CLOSED)   |
| DELETE | `/api/inquiries/:id`                   | Delete an inquiry                        |

**MLS API** (port 4020)

| Method | Path                         | Description                                          |
|--------|------------------------------|------------------------------------------------------|
| GET    | `/api`                       | Check whether the API is running                     |
| GET    | `/api/health`                | Service and database health                          |
| POST   | `/api/listings`              | Create a listing                                     |
| GET    | `/api/listings`              | Search: `city`, `status`, `propertyType`, `minPrice`, `maxPrice`, `minBedrooms`, `search`, `sortBy`, `sortOrder`, `page`, `limit` |
| GET    | `/api/listings/search`       | Full-text search (Elasticsearch, cached in Redis): `q` + the filters above |
| POST   | `/api/listings/search/reindex` | Rebuild the search index from PostgreSQL |
| GET    | `/api/listings/stats`        | Counts by status; count and average price by city    |
| GET    | `/api/listings/:mlsNumber`   | Get a listing                                        |
| PATCH  | `/api/listings/:mlsNumber`   | Update a listing                                     |
| DELETE | `/api/listings/:mlsNumber`   | Delete a listing                                     |

List endpoints return `{ data: [...], meta: { page, limit, total, totalPages } }`.
Errors return `{ statusCode, message, error }`.

## Environment variables

All three apps read **one file: `.env` in the project root** (template:
`.env.example`).

- Settings **without a prefix** are shared by every app.
- Settings with **`API_`, `MLS_` or `WEB_`** apply to one app only.
- Any shared backend setting can be overridden for one service by adding its
  prefix, e.g. `MLS_DATABASE_POOL_MAX=20` or `API_LOG_LEVEL=warn`. Each backend
  looks for its prefixed name first, then the shared name.
- `${NAME}` reuses a value defined earlier in the file, so changing
  `API_PORT` also updates `NEXT_PUBLIC_API_URL`.

| Variable | Local value | Used by | Purpose |
|---|---|---|---|
| `APP_ENV` | `dev` | all | Environment identifier (dev, test, staging, prod) |
| `NODE_ENV` | `development` | all | Node.js runtime mode |
| `WEB_PORT` | `3000` | web | Web app port |
| `API_PORT` | `4000` | api | Main API port |
| `MLS_PORT` | `4020` | mls | MLS API port |
| `API_SERVICE_NAME` | `penthouselife-api` | api | Name in logs and `/health` |
| `MLS_SERVICE_NAME` | `penthouselife-mls` | mls | Name in logs and `/health` |
| `API_SWAGGER_TITLE` | `PenthouseLife Main API` | api | Docs title |
| `MLS_SWAGGER_TITLE` | `PenthouseLife MLS API` | mls | Docs title |
| `API_SWAGGER_DESCRIPTION` | `REST API documentation for …` | api | Docs description (optional) |
| `MLS_SWAGGER_DESCRIPTION` | `REST API documentation for …` | mls | Docs description (optional) |
| `HOST` | `0.0.0.0` | api, mls | Interface to bind to |
| `API_PREFIX` | `api` | api, mls | Prefix for every backend route |
| `TRUST_PROXY_HOPS` | `0` | api, mls | Proxies in front of the backends: `0` locally, `1` on Railway (per-visitor rate limits) |
| `REQUEST_BODY_LIMIT` | `1mb` | api, mls | Max request body (larger gets 413) |
| `LOG_LEVEL` | `debug` | api, mls | `error`, `warn`, `log`, `debug` or `verbose` |
| `CORS_ORIGIN` | `http://localhost:${WEB_PORT}` | api, mls | Allowed origin(s), comma-separated |
| `CORS_CREDENTIALS` | `true` | api, mls | Allow cookies/auth headers cross-origin |
| `DATABASE_URL` | built from `POSTGRES_*` | api, mls, Prisma | PostgreSQL connection string |
| `DATABASE_POOL_MAX` | `10` | api, mls | Max open connections per service |
| `DATABASE_POOL_TIMEOUT_SECONDS` | `10` | api, mls | Wait for a free pooled connection |
| `DATABASE_CONNECT_TIMEOUT_SECONDS` | `5` | api, mls | Wait when opening a connection |
| `SWAGGER_ENABLED` | `true` | api, mls | Serve Swagger UI |
| `SWAGGER_PATH` | `api-docs` | api, mls | Swagger UI path (JSON at `<path>.json`) |
| `SWAGGER_VERSION` | `1.0.0` | api, mls | Version shown in the docs |
| `RATE_LIMIT_TTL_SECONDS` | `60` | api, mls | Rate-limit window |
| `RATE_LIMIT_MAX` | `100` | api, mls | Requests per IP per window (then 429) |
| `PAGINATION_DEFAULT_LIMIT` | `20` | api, mls | Page size when `limit` is omitted |
| `PAGINATION_MAX_LIMIT` | `100` | api, mls | Largest allowed page size |
| `NEXT_PUBLIC_APP_NAME` | `PenthouseLife` | web | Product name in the UI |
| `NEXT_PUBLIC_API_URL` | `http://localhost:${API_PORT}/${API_PREFIX}` | web | Main API base URL |
| `NEXT_PUBLIC_MLS_API_URL` | `http://localhost:${MLS_PORT}/${API_PREFIX}` | web | MLS API base URL |
| `NEXT_PUBLIC_API_DOCS_URL` | `http://localhost:${API_PORT}/${SWAGGER_PATH}` | web | Link to Main API docs |
| `NEXT_PUBLIC_MLS_API_DOCS_URL` | `http://localhost:${MLS_PORT}/${SWAGGER_PATH}` | web | Link to MLS API docs |
| `NEXT_PUBLIC_API_TIMEOUT_MS` | `10000` | web | Abort backend calls after this many ms |
| `POSTGRES_USER` | `penthouse` | docker | PostgreSQL user created by docker-compose |
| `POSTGRES_PASSWORD` | `penthouse_local_dev` | docker | PostgreSQL password (local only) |
| `POSTGRES_DB` | `penthouselife` | docker | Database created by docker-compose |
| `POSTGRES_PORT` | `5432` | docker | Host port for PostgreSQL |
| `REDIS_PORT` | `6379` | docker | Host port for Redis |
| `ELASTICSEARCH_PORT` | `9200` | docker | Host port for Elasticsearch |
| `ELASTICSEARCH_HEAP` | `512m` | docker | Elasticsearch memory |
| `REDIS_URL` | `redis://localhost:${REDIS_PORT}` | mls | Redis for caching; empty turns caching off |
| `REDIS_KEY_PREFIX` | `penthouselife:` | mls | Prepended to every Redis key |
| `REDIS_CACHE_TTL_SECONDS` | `300` | mls | How long a cached search lives |
| `ELASTICSEARCH_URL` | `http://localhost:${ELASTICSEARCH_PORT}` | mls | Elasticsearch; empty turns search off |
| `ELASTICSEARCH_USERNAME` | *(empty)* | mls | Only when Elasticsearch security is on |
| `ELASTICSEARCH_PASSWORD` | *(empty)* | mls | Only when Elasticsearch security is on |
| `ELASTICSEARCH_INDEX` | `penthouselife_listings` | mls | Index that holds the listings |
| `ELASTICSEARCH_REQUEST_TIMEOUT_MS` | `5000` | mls | Timeout for Elasticsearch requests |

The pool settings are added to the Prisma connection as `connection_limit`,
`pool_timeout` and `connect_timeout`. If those parameters are already in
`DATABASE_URL`, the URL's own values win.

`NEXT_PUBLIC_*` values are inlined into the browser bundle at **build** time,
so build the web app with the target environment's values.

### Deploying services separately

On a host where each service runs on its own, you can set plain names instead
of prefixed ones (`PORT`, `SERVICE_NAME`, `SWAGGER_TITLE`). The backends fall
back to them automatically, and the web app uses `PORT` when `WEB_PORT` is not set.

## How configuration works

- The `.env` file is loaded by `dotenv-cli` in the npm scripts, never by
  application code. Variables already set on the host always win over the file.
- Backend: `src/config/load-config.ts` is the only file that reads `process.env`.
  `src/config/env-scope.ts` holds the service's prefix (`API` or `MLS`).
  All variables are validated at startup and every problem is listed at once.
  Code reads values with `config.get('port')`, `config.get('swagger').enabled`, etc.
- Web: `src/config/public-config.ts` and `src/config/server-config.ts` are the
  only files that read `process.env`. `scripts/next.mjs` maps `WEB_PORT` to the
  port Next.js listens on. All HTTP calls go through `src/lib/api-client.ts`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start all three apps |
| `npm run services:up` | Start PostgreSQL, Redis and Elasticsearch in Docker |
| `npm run services:down` | Stop them (data is kept) |
| `npm run services:status` | Show whether they are running and healthy |
| `npm run build` | Build all three apps |
| `npm run db:migrate` | Create/apply a dev migration |
| `npm run db:seed` | Insert sample data |
| `npm run db:reset` | Drop, recreate and migrate the dev database |
| `npm run db:studio` | Browse the database in the browser |
| `npm run db:deploy` / `db:deploy:env` | Apply migrations (host variables / env file) |
| `npm run openapi:export` | Write both OpenAPI JSON files to `docs/openapi/` |

Each app also has `start` (reads variables from the host) and `start:env`
(reads the root `.env`).

## Deploying

Step-by-step Railway setup (web, api, mls, PostgreSQL, Redis, Elasticsearch),
with every variable ready to paste: **[docs/RAILWAY.md](docs/RAILWAY.md)**.

## Secrets

`.env` is git-ignored; only `.env.example` is committed. Never put real
credentials in the template. v
