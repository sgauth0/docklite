# Docklite Agent Spec (extracted from Docklite backend)

This document inventories Docklite backend actions that do server-side work and proposes a minimal `docklite-agent` v0 API. The inventory references the current Docklite API handlers and the underlying helpers they call.

## 1) Endpoint inventory (server-side actions)

### health/status

#### Server stats (system + Docker)
- **Handler**: `app/api/server/stats/route.ts` → `GET()`
- **Inputs**: none (auth required)
- **Side effects**:
  - Reads `/proc/stat` and `/proc/net/dev`.
  - Executes `df -B1 / | tail -1` shell command.
  - Calls Docker API (`docker.info()`, `docker.version()`).
- **Outputs**: JSON with host info + metrics (`hostname`, `platform`, `arch`, `cpus`, `totalMemory`, `freeMemory`, `uptime`, `dockerVersion`, `containerCount`, `imageCount`, `cpuUsage`, `diskUsage`, `networkStats`).
- **Dependencies**:
  - Docker socket via `lib/docker.ts` (`DOCKER_SOCKET_PATH`).
  - OS files `/proc/*` and `df` command. 
- **Code**: `app/api/server/stats/route.ts` (`GET`, helper functions) + `lib/docker.ts` (`docker` client initialization). 

#### Debug health snapshot
- **Handler**: `app/api/debug/route.ts` → `GET()`
- **Inputs**: none (auth required)
- **Side effects**:
  - Calls Docker list API via `listContainers(true)`.
  - Reads DB connectivity by executing SQLite queries.
- **Outputs**: JSON status object with `database`, `docker`, `authentication`, and `status`.
- **Dependencies**: Docker socket + SQLite DB.
- **Code**: `app/api/debug/route.ts` + `lib/docker.ts`.

### apps/containers

#### List DockLite-managed containers (foldered)
- **Handler**: `app/api/containers/route.ts` → `GET()`
- **Inputs**: none (auth required)
- **Side effects**:
  - Docker list via `listContainers(true)`.
  - DB reads for folders, sites, users, folder assignments.
- **Outputs**: `{ folders: FolderNode[], totalContainers }`.
- **Dependencies**: Docker socket, SQLite tables `folders`, `folder_containers`, `sites`, `users`.
- **Code**: `app/api/containers/route.ts` + `lib/docker.ts` + `lib/db.ts` folder/site/user getters.

#### List all containers (admin)
- **Handler**: `app/api/containers/all/route.ts` → `GET()`
- **Inputs**: none (auth required)
- **Side effects**: Docker list via `listContainers(false)`.
- **Outputs**: `{ containers }`.
- **Dependencies**: Docker socket.
- **Code**: `app/api/containers/all/route.ts` + `lib/docker.ts`.

#### Inspect container
- **Handler**: `app/api/containers/[id]/inspect/route.ts` → `GET()`
- **Inputs**: path param `id`
- **Side effects**: Docker inspect (`docker.getContainer(id).inspect()`).
- **Outputs**: `{ container: { id, name, image, created, state, env, labels, mounts, networkSettings, restartPolicy, resources } }`.
- **Dependencies**: Docker socket.
- **Code**: `app/api/containers/[id]/inspect/route.ts`.

#### Get container (summary + stats)
- **Handler**: `app/api/containers/[id]/route.ts` → `GET()`
- **Inputs**: path param `id`
- **Side effects**:
  - Docker inspect through `getContainerById`.
  - Docker stats via `getContainerStats` when running.
- **Outputs**: `{ container, stats }`.
- **Dependencies**: Docker socket, SQLite `sites` table for access checks.
- **Code**: `app/api/containers/[id]/route.ts` + `lib/docker.ts`.

#### Start container
- **Handler**: `app/api/containers/[id]/start/route.ts` → `POST()`
- **Inputs**: path param `id`
- **Side effects**:
  - Docker start (`startContainer`).
  - DB update `sites.status = 'running'` when a site exists.
- **Outputs**: `{ success: true }`.
- **Dependencies**: Docker socket; SQLite `sites` table.
- **Code**: `app/api/containers/[id]/start/route.ts` + `lib/docker.ts` + `lib/db.ts` (`updateSiteStatus`).

#### Stop container
- **Handler**: `app/api/containers/[id]/stop/route.ts` → `POST()`
- **Inputs**: path param `id`
- **Side effects**:
  - Docker stop (`stopContainer`).
  - DB update `sites.status = 'stopped'` when a site exists.
- **Outputs**: `{ success: true }`.
- **Dependencies**: Docker socket; SQLite `sites` table.
- **Code**: `app/api/containers/[id]/stop/route.ts` + `lib/docker.ts` + `lib/db.ts`.

#### Restart container
- **Handler**: `app/api/containers/[id]/restart/route.ts` → `POST()`
- **Inputs**: path param `id`
- **Side effects**:
  - Docker restart (`restartContainer`).
  - DB update `sites.status = 'running'` when a site exists.
- **Outputs**: `{ success: true }`.
- **Dependencies**: Docker socket; SQLite `sites` table.
- **Code**: `app/api/containers/[id]/restart/route.ts` + `lib/docker.ts` + `lib/db.ts`.

#### Container logs
- **Handler**: `app/api/containers/[id]/logs/route.ts` → `GET()`
- **Inputs**: path param `id`, query param `tail` (default 100)
- **Side effects**: Docker logs (`container.logs` via `getContainerLogs`).
- **Outputs**: `{ logs: string }`.
- **Dependencies**: Docker socket.
- **Code**: `app/api/containers/[id]/logs/route.ts` + `lib/docker.ts`.

#### Container stats (metrics)
- **Handler**: `app/api/containers/[id]/stats/route.ts` → `GET()`
- **Inputs**: path param `id`
- **Side effects**: Docker stats (`container.stats` via `getContainerStats`).
- **Outputs**: `{ stats: { cpu, memory: { used, total, percentage } } }` or 404 when unavailable.
- **Dependencies**: Docker socket.
- **Code**: `app/api/containers/[id]/stats/route.ts` + `lib/docker.ts`.

#### Delete container (and site record)
- **Handler**: `app/api/containers/[id]/route.ts` → `DELETE()`
- **Inputs**: path param `id`
- **Side effects**:
  - Docker remove (`removeContainer(..., force=true)`).
  - DB deletes: `sites` (if mapped) and `folder_containers`.
- **Outputs**: `{ success: true }`.
- **Dependencies**: Docker socket; SQLite `sites`, `folder_containers`.
- **Code**: `app/api/containers/[id]/route.ts` + `lib/docker.ts` + `lib/db.ts`.

### sites (create/info/restart/delete)

#### Create site (container + filesystem + DB)
- **Handler**: `app/api/containers/route.ts` → `POST()`
- **Inputs**: JSON body `{ domain, template_type, user_id?, code_path?, folder_id?, port?, include_www? }`
- **Side effects**:
  - Filesystem: creates site directory + default index file.
  - Docker: pulls images and creates container (`createContainer` with generated template).
  - DB: inserts/updates `sites` + sets `container_id` + `status`.
- **Outputs**: `{ success: true, site_id }` or error JSON.
- **Dependencies**:
  - `SITES_BASE_DIR=/var/www/sites` (implicit in `lib/site-helpers.ts`).
  - Docker socket.
  - SQLite tables `sites`, `folders`.
- **Code**: `app/api/containers/route.ts` + `lib/site-helpers.ts` + `lib/docker.ts` + `lib/templates/*` + `lib/db.ts`.

#### Restart site (via container restart)
- **Handler**: `app/api/containers/[id]/restart/route.ts` → `POST()`
- **Inputs**: path param `id`
- **Side effects**:
  - Docker restart.
  - DB update to `sites.status = 'running'`.
- **Outputs**: `{ success: true }`.
- **Dependencies**: Docker socket; SQLite `sites`.
- **Code**: `app/api/containers/[id]/restart/route.ts` + `lib/docker.ts` + `lib/db.ts`.

#### Delete site (via container delete)
- **Handler**: `app/api/containers/[id]/route.ts` → `DELETE()`
- **Inputs**: path param `id`
- **Side effects**:
  - Docker remove.
  - DB delete `sites` + unlink from folders.
  - (Note: no filesystem cleanup here.)
- **Outputs**: `{ success: true }`.
- **Dependencies**: Docker socket; SQLite `sites`, `folder_containers`.
- **Code**: `app/api/containers/[id]/route.ts` + `lib/db.ts` + `lib/docker.ts`.

### databases

#### List databases
- **Handler**: `app/api/databases/route.ts` → `GET()`
- **Inputs**: none (auth required)
- **Side effects**: DB read from `databases` + `database_permissions`.
- **Outputs**: `{ databases }`.
- **Dependencies**: SQLite tables `databases`, `database_permissions`.
- **Code**: `app/api/databases/route.ts` + `lib/db.ts`.

#### Create database (container + DB)
- **Handler**: `app/api/databases/route.ts` → `POST()`
- **Inputs**: JSON body `{ name, username?, password? }`
- **Side effects**:
  - Docker: pulls `postgres:16-alpine`, creates container.
  - DB: insert into `databases`, grant permissions.
- **Outputs**: `{ database, connection: { host, port, database, username, password } }`.
- **Dependencies**: Docker socket; SQLite tables `databases`, `database_permissions`.
- **Code**: `app/api/databases/route.ts` + `lib/docker.ts` + `lib/db.ts` + `lib/templates/database`.

#### Get database (admin)
- **Handler**: `app/api/databases/[id]/route.ts` → `GET()`
- **Inputs**: path param `id`
- **Side effects**: DB read from `databases`.
- **Outputs**: `{ database }`.
- **Dependencies**: SQLite `databases`.
- **Code**: `app/api/databases/[id]/route.ts` + `lib/db.ts`.

#### Update database credentials
- **Handler**: `app/api/databases/[id]/route.ts` → `PATCH()`
- **Inputs**: path param `id`, JSON body `{ username, password }`
- **Side effects**: `docker exec` into container to alter/create user and grant privileges.
- **Outputs**: `{ success: true, message }`.
- **Dependencies**: Docker CLI in PATH; Docker container running.
- **Code**: `app/api/databases/[id]/route.ts`.

#### Delete database (admin)
- **Handler**: `app/api/databases/[id]/route.ts` → `DELETE()`
- **Inputs**: path param `id`
- **Side effects**:
  - Docker remove container.
  - DB delete from `databases` + `database_permissions`.
- **Outputs**: `{ success: true }`.
- **Dependencies**: Docker socket; SQLite tables `databases`, `database_permissions`.
- **Code**: `app/api/databases/[id]/route.ts` + `lib/docker.ts` + `lib/db.ts`.

#### Database schema read
- **Handler**: `app/api/databases/[id]/schema/route.ts` → `POST()`
- **Inputs**: path param `id`, JSON body `{ username, password }`
- **Side effects**: `docker exec` running `psql` via `runPsql`.
- **Outputs**: `{ tables: [{ name, columns: [{ name, type, nullable }] }] }`.
- **Dependencies**: Docker CLI; container running.
- **Code**: `app/api/databases/[id]/schema/route.ts` + `app/api/databases/[id]/db-utils.ts`.

#### Database table preview
- **Handler**: `app/api/databases/[id]/table/route.ts` → `POST()`
- **Inputs**: path param `id`, JSON body `{ username, password, table }`
- **Side effects**: `docker exec` running `psql` via `runPsql`.
- **Outputs**: `{ columns: [{ name, type, nullable }], rows }`.
- **Dependencies**: Docker CLI; container running.
- **Code**: `app/api/databases/[id]/table/route.ts` + `app/api/databases/[id]/db-utils.ts`.

#### Database ad-hoc query
- **Handler**: `app/api/databases/[id]/query/route.ts` → `POST()`
- **Inputs**: path param `id`, JSON body `{ username, password, sql }`
- **Side effects**: `docker exec` running `psql` via `runPsql`.
- **Outputs**:
  - Selects: `{ type: 'select', rows, columns }`
  - Commands: `{ type: 'command', output }`
- **Dependencies**: Docker CLI; container running.
- **Code**: `app/api/databases/[id]/query/route.ts` + `app/api/databases/[id]/db-utils.ts`.

#### Database stats (sizes)
- **Handler**: `app/api/databases/stats/route.ts` → `GET()`
- **Inputs**: none (auth required)
- **Side effects**: uses `docker exec` to query size per DB in Postgres.
- **Outputs**: `{ docklite: { tables, file }, databases: [...] }`.
- **Dependencies**: Docker CLI; SQLite `databases`.
- **Code**: `app/api/databases/stats/route.ts`.

### traefik / SSL

#### SSL status inspection
- **Handler**: `app/api/ssl/status/route.ts` → `GET()`
- **Inputs**: none (auth required)
- **Side effects**:
  - Reads ACME JSON file(s) from `ACME_PATHS` or `/letsencrypt/acme.json`.
  - Calls Traefik API (`TRAEFIK_API_URL`) and/or Docker API for labels.
  - Reads `sites` table to ensure managed hosts included.
- **Outputs**: `{ sites, allSites, meta }` with SSL status per domain.
- **Dependencies**: Traefik API URL, Docker socket, filesystem for ACME.
- **Code**: `app/api/ssl/status/route.ts` + `lib/docker.ts` + `lib/db.ts`.

#### SSL repair (Traefik restart)
- **Handler**: `app/api/ssl/repair/route.ts` → `POST()`
- **Inputs**: JSON body `{ domain }`
- **Side effects**: Docker list + restart Traefik container (`TRAEFIK_CONTAINER_NAME`).
- **Outputs**: `{ success: true, message }`.
- **Dependencies**: Docker socket; env `TRAEFIK_CONTAINER_NAME`.
- **Code**: `app/api/ssl/repair/route.ts`.

### cloudflare (DNS)

#### Cloudflare config read
- **Handler**: `app/api/dns/config/route.ts` → `GET()`
- **Inputs**: none (admin)
- **Side effects**: DB read from `cloudflare_config`.
- **Outputs**: `{ enabled, hasToken, accountId }`.
- **Dependencies**: SQLite `cloudflare_config`.
- **Code**: `app/api/dns/config/route.ts` + `lib/db.ts`.

#### Cloudflare config update
- **Handler**: `app/api/dns/config/route.ts` → `POST()`
- **Inputs**: JSON body `{ api_token?, account_id?, enabled? }`
- **Side effects**:
  - Cloudflare token verification via HTTPS.
  - DB update `cloudflare_config`.
- **Outputs**: `{ message }`.
- **Dependencies**: Cloudflare API + `cloudflare_config` table.
- **Code**: `app/api/dns/config/route.ts` + `lib/cloudflare.ts` + `lib/db.ts`.

#### DNS zones list/create/update/delete
- **Handler**: `app/api/dns/zones/route.ts` → `GET()`, `POST()`, `PUT()`, `DELETE()`
- **Inputs**:
  - `POST`: `{ domain, zone_id, account_id?, auto_import? }`
  - `PUT`: `{ id, domain?, zone_id?, account_id?, enabled? }`
  - `DELETE`: query `id`
- **Side effects**: DB writes to `dns_zones`.
- **Outputs**: list or `{ id, message }` / `{ message }`.
- **Dependencies**: SQLite `dns_zones`.
- **Code**: `app/api/dns/zones/route.ts` + `lib/db.ts`.

#### DNS records list/create/update/delete
- **Handler**: `app/api/dns/records/route.ts` → `GET()`, `POST()`, `PUT()`, `DELETE()`
- **Inputs**:
  - `GET`: query `zone_id` optional
  - `POST`: `{ zone_id, type, name, content, ttl?, priority?, proxied? }`
  - `PUT`: `{ id, type?, name?, content?, ttl?, priority?, proxied? }`
  - `DELETE`: query `id`
- **Side effects**:
  - DB writes to `dns_records`.
  - Cloudflare API `createDNSRecord` on create when enabled.
  - (Update/delete Cloudflare calls are TODOs.)
- **Outputs**: list or `{ id, message }` / `{ message }`.
- **Dependencies**: `cloudflare_config`, `dns_records`, `dns_zones` + Cloudflare API.
- **Code**: `app/api/dns/records/route.ts` + `lib/cloudflare.ts` + `lib/db.ts`.

#### DNS sync
- **Handler**: `app/api/dns/sync/route.ts` → `POST()`
- **Inputs**: JSON body `{ zone_id? }`
- **Side effects**:
  - Cloudflare API `listDNSRecords`.
  - DB delete + insert for `dns_records`.
  - DB update `dns_zones.last_synced_at`.
- **Outputs**: `{ message, results }`.
- **Dependencies**: Cloudflare API; SQLite `dns_zones` + `dns_records`.
- **Code**: `app/api/dns/sync/route.ts` + `lib/cloudflare.ts` + `lib/db.ts`.

### backups (server-side file/DB work)

#### List/delete backups + cleanup
- **Handler**: `app/api/backups/route.ts` → `GET()`, `DELETE()`, `POST()`
- **Inputs**:
  - `GET`: query `job_id`, `target_type`, `target_id`
  - `DELETE`: query `id`
  - `POST`: `{ destination_id, retention_days }`
- **Side effects**: DB reads and deletes in `backups`.
- **Outputs**: `{ backups }` or `{ message }`.
- **Dependencies**: SQLite `backups` + backup destination tables.
- **Code**: `app/api/backups/route.ts` + `lib/db.ts`.

#### Trigger backup job
- **Handler**: `app/api/backups/trigger/route.ts` → `POST()`
- **Inputs**: JSON body `{ job_id }`
- **Side effects**:
  - Triggers `triggerBackupJob` (async) which:
    - Runs `tar -czf` for site backups.
    - Runs `docker exec ... pg_dump ...` for database backups.
    - Writes backup files to destination path.
    - Updates `backups` table status.
- **Outputs**: `{ message }`.
- **Dependencies**: Docker CLI, filesystem, SQLite `backups`, `backup_jobs`, `backup_destinations`.
- **Code**: `app/api/backups/trigger/route.ts` + `lib/backup-scheduler.ts`.

#### Local backup file list/download/delete
- **Handler**: `app/api/backups/local/route.ts` + `app/api/backups/local/download/route.ts`
- **Inputs**: query params `file` or `filename`
- **Side effects**: filesystem reads/deletes under `/var/backups/docklite` (or configured path).
- **Outputs**: JSON list / streaming file response.
- **Dependencies**: filesystem paths and permissions.
- **Code**: `app/api/backups/local/route.ts` + `app/api/backups/local/download/route.ts`.

### misc infra actions

#### Port suggestion (for Node apps)
- **Handler**: `app/api/ports/suggest/route.ts` → `GET()`
- **Inputs**: none (auth required)
- **Side effects**: Docker list to inspect labels for used ports.
- **Outputs**: `{ port }` (suggested port).
- **Dependencies**: Docker socket.
- **Code**: `app/api/ports/suggest/route.ts` + `lib/docker.ts`.

#### DB cleanup (dangling site/database records)
- **Handler**: `app/api/db/cleanup/route.ts` → `POST()`
- **Inputs**: none (admin required)
- **Side effects**:
  - Docker list to find existing containers.
  - DB delete `sites`, `databases`, `database_permissions` for missing containers.
- **Outputs**: `{ sites: number, databases: number }`.
- **Dependencies**: Docker socket; SQLite `sites`, `databases`, `database_permissions`.
- **Code**: `app/api/db/cleanup/route.ts` + `lib/docker.ts`.

## 2) Agent API categories (mapping)

- **health/status**: server stats (`/api/server/stats`), debug health snapshot (`/api/debug`).
- **apps/containers**: list/inspect/start/stop/restart/logs/stats/delete (`/api/containers*`).
- **sites**: create (same as container create), restart/delete (container routes), site info derives from `sites` table.
- **databases**: list/create/get/update creds/delete, schema/table/query, stats.
- **traefik**: SSL status and repair (Traefik restart).
- **cloudflare**: DNS config, zones, records, sync.
- **plugins**: no existing implementation.

## 3) Proposed minimal docklite-agent API (v0)

**Only routes already clearly implemented above are included.**

### Base routes
- `GET /health`
  - Response: `{ status: "ok" }` (simple heartbeat wrapper in agent).
- `GET /status`
  - Response: same shape as current `/api/server/stats` payload.

### Apps / containers
- `GET /apps`
  - Response: `{ containers: ContainerInfo[] }` (flat list; folder tree remains UI-server responsibility in v0).
- `POST /apps/{id}/start`
  - Response: `{ success: true }`
- `POST /apps/{id}/stop`
  - Response: `{ success: true }`
- `POST /apps/{id}/restart`
  - Response: `{ success: true }`
- `GET /apps/{id}/logs?tail=200`
  - Response: `{ logs: string }`

### Additional existing actions (optional v0 if needed by UI)
- `GET /apps/{id}` (container + stats payload)
- `GET /apps/{id}/stats`
- `GET /apps/{id}/inspect`

## 4) Agent state storage recommendation

Docklite state already lives in a **SQLite database** at `DATABASE_PATH` (default `data/docklite.db`) with tables for `sites`, `databases`, folders, backups, and DNS. The agent should **reuse the same SQLite DB** rather than introducing a new store, and should also continue to use the filesystem for site code (`/var/www/sites`) and backups (`/var/backups/docklite`). This keeps the agent minimal while preserving existing data/behavior.

- **DB location**: `lib/db.ts` uses `DATABASE_PATH` or `data/docklite.db`.
- **Site storage**: `lib/site-helpers.ts` uses `/var/www/sites`.
- **Backup storage**: `lib/backup-scheduler.ts` uses `/var/backups/docklite` (or destination config).

### v0 write policy (important)
- **Read-only DB access** for the agent in v0. Use SQLite for access checks and metadata lookups only.
- **Avoid mutating `sites.status`** or other orchestration fields from the agent in v0; let the UI server remain the source of truth for state transitions. (Temporary coupling if needed, but document it explicitly if introduced.)

## 5) Go project skeleton (docklite-agent)

```
cmd/
  docklite-agent/
    main.go              # HTTP server bootstrap, config, DI
internal/
  api/
    router.go            # route wiring
  handlers/
    health.go            # GET /health
    status.go            # GET /status (wraps server stats)
    containers.go        # list/start/stop/restart/logs
  docker/
    client.go            # thin Docker SDK wrapper (list/inspect/stats/logs/lifecycle)
    containers.go        # container operations
  store/
    sqlite.go            # SQLite connection (DATABASE_PATH)
    sites.go             # site lookups for access
  models/
    container.go         # ContainerInfo / stats structs
    status.go            # server stats response structs
  config/
    config.go            # env vars (DOCKER_SOCKET_PATH, DATABASE_PATH, etc.)
```

## 6) Migration notes (prioritize existing endpoints)

Start with converting the Docklite UI/server to call the agent for these existing routes, in order:
1. **Status/health**: `/api/server/stats` and `/api/debug` should proxy to `GET /status` and `GET /health`.
2. **Container list and logs**: `/api/containers`, `/api/containers/[id]/logs` to agent `/apps` + `/apps/{id}/logs`.
3. **Lifecycle actions**: `/api/containers/[id]/start|stop|restart` to agent actions.
4. **Container details/metrics**: `/api/containers/[id]`, `/api/containers/[id]/stats`, `/api/containers/[id]/inspect` to agent equivalents.

These reuse existing Docker logic (`lib/docker.ts`) and DB lookups for site access control.

## 7) Authentication boundary (v0)
- Agent listens on **localhost or a Unix socket only**.
- UI server is the **only intended caller** (no end-user auth, no JWTs, no public exposure).

## 8) Next spec (follow-up doc)
Draft a short companion document: **“What the UI server stops doing once the agent exists.”** This should list which routes will proxy to the agent and which responsibilities remain UI-owned (auth, policy, DB writes, external API integrations).
