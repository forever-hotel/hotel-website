# Forever Hotel website

Guest-facing Next.js frontend, NestJS backend and PostgreSQL integration. New
checkout uses PayHere; Brevo handles email. Browser traffic reaches the backend
through the separate API Gateway repository, using the `/hw` prefix.

Start with the [fresh-checkout setup](documents/release/setup.md), including
sample local environment values, a disposable database and gateway setup.
Then use the [test and demo checklist](documents/release/demo.md) and the
[HW-01–HW-17 / screen traceability matrix](documents/release/traceability.md).
The current [API guide index and examples](documents/release/api.md) distinguish
implemented endpoints from the historical contract draft below.

Current staging URL: https://forever-hotel-staging.malaysiawest.cloudapp.azure.com.
The coordinated 300-user test, final content/legal approval and several service decisions remain
pending; see the named gaps in the traceability matrix. A passing local fixture
test does not establish that those release gates passed.

Final guideline deliverables 6–9 are directly under `documents/`:
[coverage report](documents/coverage-sprint8.pdf),
[test register](documents/test-register.pdf),
[OWASP evidence](documents/owasp-checklist.pdf) and
[performance results](documents/performance-report.pdf). These reports
record unresolved vulnerabilities, blocked integration and unexecuted staging/load
checks; they are not blanket compliance or release approvals.

See the [local container setup](#local-container-setup) to build and
run the frontend, backend and private PostgreSQL database with Docker Compose.

The backend is in [`backend/`](backend/). See the [backend setup guide](backend/README.md) for local PostgreSQL configuration, environment variables, and run commands.

The frontend setup is documented in [frontend/README.md](frontend/README.md).

Review the [hotel website API contract draft](documents/api/hotel-website-contracts.md)
before implementing integrations. It contains proposed endpoints, examples and
pending cross-team decisions for DDP-#06. The matching
[GitHub issue draft](documents/api/api-contracts-issue.md) records the review and
approval requirements.

## Image publication and shared deployment

Merge a peer-reviewed PR into `develop`. `publish-images.yml` runs backend,
frontend, container and dependency security checks, verifies final-code peer
approval, then publishes both images to GHCR with source-commit labels and
immutable digest references in its summary and `release-images` artifact.
This workflow does not SSH to the VM or change running containers.

Copy the published digests into `images.hw-backend` and `images.hw-frontend`
in the infra repository's `release/current.json`. Preserve the other image
entries and supply actual reviewed schema evidence. A reviewed infra merge into
`develop` can deploy staging when `INFRA_STAGING_ENABLED=true` and host adoption,
SSH credentials, registry access and baseline checks are ready. Follow infra's
current README for these gates. HW can remain in the existing
`/opt/hotel-website-staging` Compose project while infra manages its images.

Merge this publication-only workflow and removal of legacy `staging-sample.yml`
and `staging-release.yml` into the release branch before handing deployment to
infra. These legacy workflows are absent from this checkout; verify the target
branch after merge so two controllers do not independently deploy HW.

### Changing the public hostname

Create an available DNS hostname pointing to the VM's current public IP (for
example, an available DuckDNS subdomain), then add that exact hostname to the
existing Caddy HW site. Keep the existing hostname during verification. Preserve
all other site blocks, certificate volumes and shared gateway routing. Do not
start another proxy on ports 80/443. Caddy's `/hw` traffic goes to the shared
gateway; page, `/api` and `/_next` requests stay on the HW frontend.

Set frontend runtime `APP_ORIGIN` and backend `PAYMENT_RETURN_ORIGIN` to the new
HTTPS origin with no trailing slash. Set `PAYHERE_NOTIFY_URL` to that origin plus
`/hw/payments/payhere/notify`, and update the applicable gateway CORS/other exact
origin allowlists. Register the hostname with PayHere and use its domain-specific
Merchant Secret; App ID/App Secret are a separate pair for retrieval verification.
Recreate affected containers to load runtime env changes. Sign in again on the
new hostname and test a fresh sandbox checkout and notification delivery.

Update infra's public probes and any other explicit origin checks. Its host
adoption record fingerprints Caddy/routes/Compose; review and reconcile the real
configuration change through infra's adoption process before the next automated
deployment. An image manifest update alone does not install DNS, Caddy or env
changes. Keep real credentials and DNS tokens outside Git.

## Local container setup

DDP-#07, Sprint 5. Traceability: draft SRS NFR-19; SDS §§1.2, 7.1, 7.4.

Both applications use multi-stage Node.js 22 Alpine images and run as the
unprivileged `node` user. The frontend uses Next.js standalone output, with its
static assets copied into the runtime image. The existing backend image includes
production dependencies and compiled NestJS code. Neither build includes `.env`
files or local `node_modules`.

### Prerequisites and startup

Start Docker Desktop with Linux containers and Docker Compose v2. From the
repository root in PowerShell:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Edit the root `.env` and set `COMPOSE_DB_PASSWORD` to a new local-only password
and `JWT_SECRET` to a private random value of at least 32 bytes. These are separate
from `backend/.env` and the local database does not use the remote development
database. Never commit the populated file. Missing values cause Compose to fail
before starting containers. Avoid printing `docker compose config` with values;
use its quiet validation mode:

```powershell
docker compose config --quiet
docker compose up --build --detach --wait --wait-timeout 180
docker compose ps
```

Visit http://localhost:3001. The frontend health check requests `/`; the backend
checks `/health`, including database readiness. PostgreSQL has its own readiness
check, and the backend starts after that passes.

Only frontend port 3001 is published, bound to `127.0.0.1`. The backend and
database have no published ports and share a private, externally isolated
network. This Compose file is a local scaffold smoke environment, not the shared
production infrastructure. It adds no API gateway routes. Frontend API calls
require `API_GATEWAY_URL`; infra must attach its approved gateway and configure
TLS, routes, secrets and controlled outbound access before real integrations.
The private backend network intentionally cannot reach payment or email providers.

For CI image publication and the deployment coordinator handoff, see
[image publication](README.md#image-publication-and-deployment-handoff). Shared deployment is owned by the infrastructure team.

### Verify the containers

```powershell
Invoke-WebRequest http://localhost:3001/ -UseBasicParsing
docker compose exec backend node -e "fetch('http://127.0.0.1:3000/health').then(async r => { console.log(r.status, await r.text()); if (!r.ok) process.exit(1); }).catch(() => process.exit(1))"
docker compose exec frontend id
docker compose exec backend id
docker compose ps
```

Expect HTTP 200, backend `database: "up"`, non-root application users and healthy
containers. The PORTS column must contain no host mapping for backend or database.
For negative readiness verification, stop the local database and check again:

```powershell
docker compose stop database
docker compose exec backend node -e "fetch('http://127.0.0.1:3000/health').then(async r => { const b = await r.json(); console.log(r.status, b); if (r.status !== 503 || b.error !== 'DATABASE_UNAVAILABLE') process.exit(1); }).catch(() => process.exit(1))"
docker compose up --detach --wait --wait-timeout 180
```

The backend image health check eventually becomes unhealthy during an outage;
the HTTP check should return 503. Restarting the stack restores the database.

### Database tables, persistence and stopping

Tables are owned by migrations in `forever-hotel/infra`; this repository never
creates or changes them, and schema synchronization stays disabled. For the
local stack, Compose mounts a read-only copy of the team schema
([`database/infra-schema/`](database/infra-schema/)) into PostgreSQL's
`/docker-entrypoint-initdb.d`, so the tables are created automatically the
**first** time the database starts with an empty volume.

PostgreSQL runs these files only on an empty volume. After the schema copy is
refreshed, recreate the local database (this deletes its data):

```powershell
docker compose down --volumes
docker compose up --build --detach --wait --wait-timeout 180
```

Check that the tables exist:

```powershell
docker compose exec database psql -U hotel_website -d hotel_website -c "\dt"
```

PostgreSQL data persists in the named `database-data` volume. Changing the root
password after first startup does not change the existing database user's
password; rotate it in PostgreSQL as well. Stop without deleting data:

```powershell
docker compose down
```

Use `docker compose down --volumes` only when deliberately discarding this local
database. CI uses it only for its disposable test stack.

### Build and CI verification

```powershell
docker compose build frontend backend
```

The container workflow builds both images, waits for health, checks the frontend
and backend, verifies non-root application users and no backend/database host
ports, and tests database-outage readiness. It runs for PRs and pushes to
`develop` and `pre-develop`. Review its actual run before marking DDP-#07 complete.

At implementation time, local Compose syntax validation passed, but the Docker
Desktop Linux engine was not running. Container image builds and smoke checks
remain unverified locally; they must pass in Docker Desktop or CI.

Implementation references: [Next.js container guide](https://docs.docker.com/guides/nextjs/)
and [Compose networking](https://docs.docker.com/compose/how-tos/networking/), plus
the installed Next.js `output` documentation under `node_modules/next/dist/docs/`.

## Image publication and deployment handoff

`.github/workflows/publish-images.yml` runs backend, frontend, container and
security checks on develop merges. After final-code peer approval it publishes
separate GHCR frontend/backend images tagged by source commit, with OCI source
and revision labels. Immutable digests are in the job summary and release-images
artifact. Optional STAGING_ROOM_IMAGE_HOSTS configures allowed external image
hosts at build time. Server-only API_GATEWAY_URL is configured by deployment.

This repository no longer owns SSH deployment, staging Compose release scripts
or rollback orchestration. The infrastructure coordinator consumes these images
and manages runtime secrets, networking, readiness checks and release recovery.
