# Deploying to Railway

Six services in one Railway project:

```
                    Internet (HTTPS)
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
        web  ──browser──▶  api            mls
     (Next.js)          (NestJS)        (NestJS)
                           │             │   │   │
                           ▼             ▼   ▼   ▼
                        Postgres ◀───────┘ Redis Elasticsearch
                              (private network: *.railway.internal)
```

- **web, api, mls** come from this GitHub repo and get public domains.
- **Postgres, Redis, Elasticsearch** stay private. api and mls reach them
  through Railway's private network.
- The browser calls api and mls on their public domains, so those two need
  public domains and CORS allowing the web domain.

The code does not change. Only the variables differ from your local `.env`.

---

## 1. Prepare the repository

1. **Create the database migration** (Railway applies it on every deploy).
   With Docker running locally:

   ```bash
   npm run services:up
   npm run db:migrate        # name it "init"
   ```

   This creates `prisma/migrations/`. Without Docker, generate it without a
   database instead:

   ```bash
   mkdir prisma/migrations/0_init
   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
   ```

   On Windows PowerShell, create the folder with `mkdir prisma\migrations\0_init`.
   If the file comes out in UTF-16, re-save it as UTF-8 in VS Code.

2. **Commit and push** to GitHub, including `package-lock.json` and
   `prisma/migrations/`. `.env` is git-ignored and must stay out of Git.

## 2. Create the services

In a new Railway project:

| Add | How | Name it exactly |
|---|---|---|
| PostgreSQL | **+ New → Database → PostgreSQL** | `Postgres` |
| Redis | **+ New → Database → Redis** (comes with a volume) | `Redis` |
| Elasticsearch | **+ New → Template → search "Elasticsearch"** (the one with a `/esdata` volume) | `Elasticsearch` |
| Main API | **+ New → GitHub Repo → this repo** | `api` |
| MLS API | **+ New → GitHub Repo → this repo** again | `mls` |
| Web | **+ New → GitHub Repo → this repo** again | `web` |

The names matter: the variables below refer to services by name, e.g.
`${{Postgres.DATABASE_URL}}`. If you use other names, change the references.

Use the Elasticsearch **template**, not the plain Docker image. Railway volumes
are owned by root and Elasticsearch refuses to run as root, so the plain image
crash-loops; the template handles this. Elasticsearch needs about 1 GB of RAM.

If Railway auto-detects the npm workspaces when you import the repo, it may
create the app services for you; rename them to `api`, `mls` and `web` and
replace their settings with the ones below.

## 3. Settings for the three app services

Leave **Root Directory** empty for all three: the apps share the root
`package.json`, lock file and `prisma/` folder.

| Setting | api | mls | web |
|---|---|---|---|
| Build Command | `npm run db:generate && npm run build -w apps/api` | `npm run db:generate && npm run build -w apps/mls` | `npm run build -w apps/web` |
| Start Command | `npm run start -w apps/api` | `npm run start -w apps/mls` | `npm run start -w apps/web` |
| Pre-Deploy Command | `npm run db:deploy` | *(none)* | *(none)* |
| Healthcheck Path | `/api/health` | `/api/health` | `/` |
| Watch Paths | `/apps/api/**` `/prisma/**` `/package.json` `/package-lock.json` | `/apps/mls/**` `/prisma/**` `/package.json` `/package-lock.json` | `/apps/web/**` `/package.json` `/package-lock.json` |
| Networking | **Generate Domain** | **Generate Domain** | **Generate Domain** |

Only api runs migrations, so the two backends never migrate at the same time.
Watch paths make a push that only touches the web app redeploy only web.

## 4. Variables

Open each service → **Variables → Raw Editor**, paste, and save.
Do **not** set `PORT`: Railway provides it, and the apps use it automatically.

### api

```env
APP_ENV=prod
NODE_ENV=production
SERVICE_NAME=penthouselife-api
HOST=::
API_PREFIX=api
TRUST_PROXY_HOPS=1
REQUEST_BODY_LIMIT=1mb
LOG_LEVEL=log
CORS_ORIGIN=https://${{web.RAILWAY_PUBLIC_DOMAIN}}
CORS_CREDENTIALS=true
DATABASE_URL=${{Postgres.DATABASE_URL}}
DATABASE_POOL_MAX=10
DATABASE_POOL_TIMEOUT_SECONDS=10
DATABASE_CONNECT_TIMEOUT_SECONDS=5
SWAGGER_ENABLED=true
SWAGGER_PATH=api-docs
SWAGGER_TITLE=PenthouseLife Main API
SWAGGER_DESCRIPTION=REST API documentation for the PenthouseLife Main API
SWAGGER_VERSION=1.0.0
RATE_LIMIT_TTL_SECONDS=60
RATE_LIMIT_MAX=100
PAGINATION_DEFAULT_LIMIT=20
PAGINATION_MAX_LIMIT=100
REDIS_URL=
ELASTICSEARCH_URL=
```

### mls

```env
APP_ENV=prod
NODE_ENV=production
SERVICE_NAME=penthouselife-mls
HOST=::
API_PREFIX=api
TRUST_PROXY_HOPS=1
REQUEST_BODY_LIMIT=1mb
LOG_LEVEL=log
CORS_ORIGIN=https://${{web.RAILWAY_PUBLIC_DOMAIN}}
CORS_CREDENTIALS=true
DATABASE_URL=${{Postgres.DATABASE_URL}}
DATABASE_POOL_MAX=10
DATABASE_POOL_TIMEOUT_SECONDS=10
DATABASE_CONNECT_TIMEOUT_SECONDS=5
SWAGGER_ENABLED=true
SWAGGER_PATH=api-docs
SWAGGER_TITLE=PenthouseLife MLS API
SWAGGER_DESCRIPTION=REST API documentation for the PenthouseLife MLS API
SWAGGER_VERSION=1.0.0
RATE_LIMIT_TTL_SECONDS=60
RATE_LIMIT_MAX=100
PAGINATION_DEFAULT_LIMIT=20
PAGINATION_MAX_LIMIT=100
REDIS_URL=${{Redis.REDIS_URL}}
REDIS_KEY_PREFIX=penthouselife:
REDIS_CACHE_TTL_SECONDS=300
ELASTICSEARCH_URL=http://${{Elasticsearch.RAILWAY_PRIVATE_DOMAIN}}:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=${{Elasticsearch.ELASTIC_PASSWORD}}
ELASTICSEARCH_INDEX=penthouselife_listings
ELASTICSEARCH_REQUEST_TIMEOUT_MS=5000
```

**Check the Elasticsearch service's Variables tab first.** If it has an
`ELASTIC_PASSWORD` variable, keep the two lines above. If it has none
(security turned off), set `ELASTICSEARCH_USERNAME=` and
`ELASTICSEARCH_PASSWORD=` to empty. If its HTTP port is not 9200, change the
port in `ELASTICSEARCH_URL`.

### web

```env
APP_ENV=prod
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=PenthouseLife
NEXT_PUBLIC_API_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}/api
NEXT_PUBLIC_MLS_API_URL=https://${{mls.RAILWAY_PUBLIC_DOMAIN}}/api
NEXT_PUBLIC_API_DOCS_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}/api-docs
NEXT_PUBLIC_MLS_API_DOCS_URL=https://${{mls.RAILWAY_PUBLIC_DOMAIN}}/api-docs
NEXT_PUBLIC_API_TIMEOUT_MS=10000
```

`NEXT_PUBLIC_*` values are baked in when web is **built**. Generate the api and
mls domains before web's first build, and redeploy web whenever those domains
change (e.g. after adding a custom domain).

### Why these values differ from local

| Variable | Local | Railway | Why |
|---|---|---|---|
| `HOST` | `0.0.0.0` | `::` | Railway recommends `::` so the private network works over IPv4 and IPv6 |
| `TRUST_PROXY_HOPS` | `0` | `1` | Requests pass through Railway's proxy; without this, rate limits hit all visitors together |
| `CORS_ORIGIN`, `NEXT_PUBLIC_*` | `localhost` URLs | Railway domains | Each service has its own public HTTPS domain |
| `DATABASE_URL`, `REDIS_URL`, `ELASTICSEARCH_URL` | Docker on your PC | `*.railway.internal` via references | Private network, never exposed publicly |
| `LOG_LEVEL` | `debug` | `log` | Less noise in production logs |
| `POSTGRES_*`, `*_PORT`, `ELASTICSEARCH_HEAP` | set | not needed | Only used by `docker-compose.yml` |

## 5. Deploy and check

1. Deploy **api** and **mls** first, then **web**.
2. Open `https://<mls domain>/api/health`. You want:
   `"database": "up", "redis": "up", "elasticsearch": "up"`.
3. Open `https://<api domain>/api-docs` and `https://<mls domain>/api-docs`.
4. Open the web domain. Both services should show green.

## 6. Add the sample data (optional)

With the [Railway CLI](https://docs.railway.com/guides/cli) installed and
logged in (`railway login`, then `railway link` in the project folder):

```bash
railway ssh --service api
node prisma/seed.mjs
exit
```

Then fill the search index: in the MLS Swagger UI run
**POST /listings/search/reindex**, or simply restart the mls service (it
reindexes on startup when the counts differ).

## Troubleshooting

| Symptom | Check |
|---|---|
| Deploy fails with "Invalid environment configuration" | The log lists every missing or wrong variable by name |
| Browser shows CORS errors | `CORS_ORIGIN` must be exactly `https://<web domain>`, no trailing slash |
| Web page calls `localhost` | web was built before the variables were set; redeploy web |
| `"database": "down"` | `DATABASE_URL` reference and service name `Postgres` |
| `"redis": "down"` | `REDIS_URL` reference and service name `Redis` |
| `"elasticsearch": "down"` | service is running, port 9200, username/password match its Variables tab |
| Pre-deploy fails with "No migration found" | `prisma/migrations/` was not committed (step 1) |
| Search returns 503 "index is being created" | wait a few seconds after the first start, or run the reindex endpoint |
