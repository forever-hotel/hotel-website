# Fresh-checkout setup (DDP-#36)

Use Node 22.14+ and npm, PowerShell, and PostgreSQL 16. Docker Desktop with Linux
containers is the easiest way to create an isolated demo database. Keep the
separate `api-gateway` checkout beside `hotel-website`. No payment/email account
is required for unit, fixture browser or tooling tests. Real provider testing is
an additional setup step, not part of a basic checkout.

## 1. Install and run tests without external services

From `hotel-website`:

```powershell
cd backend
npm ci
npm run build
npm run lint
npm run format:check
node node_modules/jest/bin/jest.js --runInBand
cd ..\frontend
npm ci
npm run build
npm run lint
npm run typecheck
npm test
```

The frontend build works without a configured gateway and shows honest
unavailable/empty states. For isolated browser tests, keep Chrome/Edge installed
and run `npm run test:e2e` or `npm run test:quality` from `frontend` after building.
These use a fixture API and do not require live payments or the database. CI uses
Chrome on Linux. See [visitor journeys](../testing/visitor-booking-e2e.md) and
[responsive/accessibility checks](../testing/responsive-accessibility.md).

## 2. Create a disposable local demo database

The commands below are for a **new, disposable** database called `hw_docs_demo`,
not the shared development database. They do not modify infra's shared schema.
From the repository root, with Docker Desktop running:

```powershell
$schemaDirectory = (Resolve-Path database/infra-schema).Path
docker run --name hw-docs-demo-db --detach --publish 127.0.0.1:5432:5432 --env POSTGRES_USER=hotel_website --env POSTGRES_PASSWORD=local-demo-password --env POSTGRES_DB=hw_docs_demo --volume "${schemaDirectory}:/docker-entrypoint-initdb.d:ro" postgres:16-alpine
docker exec hw-docs-demo-db pg_isready -U hotel_website -d hw_docs_demo
```

Wait for `pg_isready` to accept connections. If port 5432 is occupied, choose a
free published port and use that value as `DB_PORT` below. The container name
must be unused; do not delete an existing database to make the command succeed.

For booking demonstrations, apply these proposals **once to this disposable
container only**. Shared/staging schema changes remain infra-owned and require
approval. The second change adds the PAYHERE enum used by new checkout:

```powershell
Get-Content documents/api/booking-storage-proposal.sql | docker exec -i hw-docs-demo-db psql -v ON_ERROR_STOP=1 -U hotel_website -d hw_docs_demo
Get-Content documents/api/payhere-storage-proposal.sql | docker exec -i hw-docs-demo-db psql -v ON_ERROR_STOP=1 -U hotel_website -d hw_docs_demo
Get-Content documents/release/demo-seed.sql | docker exec -i hw-docs-demo-db psql -v ON_ERROR_STOP=1 -U hotel_website -d hw_docs_demo
```

The guarded seed creates one visibly labelled demo room type, photo, amenity and
physical room. It cannot run unless the database name is `hw_docs_demo`. Its
price/inventory are test data, not approved hotel production content. Without
physical `rooms` rows, catalogue cards alone cannot create available inventory.

## 3. Configure the backend

Copy `backend/.env.example` to `backend/.env` only if your local file does not
already exist. Do not overwrite an existing secret file. For this isolated demo:

```dotenv
NODE_ENV=development
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=hotel_website
DB_PASSWORD=local-demo-password
DB_NAME=hw_docs_demo
DB_SSL=false
DB_SYNCHRONIZE=false
DB_LOGGING=false
JWT_ISSUER=hotel-website
BOOKING_PRICING_POLICY={"version":"local-demo-inclusive-v1","rateBasis":"INCLUSIVE","charges":[]}
PAYHERE_MODE=off
BOOKING_EMAIL_MODE=off
CONTACT_EMAIL_MODE=off
PAYMENT_RETURN_ORIGIN=http://localhost:3001
```

Generate a separate local signing secret with
`node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
and set `JWT_SECRET` privately. The inclusive pricing JSON is a **demo fixture**,
not a production tax policy. Development uses the provisional booking-management
policy; production needs explicit hotel-confirmed settings as explained in
[ADR 003](../architecture/adr-003-booking-management.md).

In a backend terminal:

```powershell
cd backend
npm run start:dev
```

Expect `GET http://localhost:3000/health` to report `database: "up"`. Development
Swagger is at `/docs`, with `/docs-json` for the generated spec. Neither is
published in production. If checkout metadata/enum changes are missing, booking
or payment availability can fail even while general health is up.

## 4. Start the separate gateway and frontend

In `api-gateway`, run `npm ci`, copy its `.env.example` if needed, and set
`HW_SERVICE_URL=http://localhost:3000` (the gateway example's port 4100 is not this
backend's default). Keep `PORT=8080` and include `http://localhost:3001` in
`ALLOWED_ORIGINS`. Leave other subsystem upstreams at their actual local values;
their absence is not proof of a system-wide healthy deployment. Run `npm run dev`.

The shipped gateway rewrites `/hw/...` to backend `/...` and forwards bearer
credentials/idempotency keys. The website backend validates its own JWTs. Do not
point frontend requests directly at the subsystem backend.

Copy `frontend/.env.example` to `frontend/.env.local` if needed:

```dotenv
API_GATEWAY_URL=http://localhost:8080
ROOM_IMAGE_HOSTS=
```

Run `npm run dev` in `frontend`, then visit `http://localhost:3001`. Verify Rooms
shows `[DEMO] Documentation Suite`, register a new test guest, sign in, and search
future dates with two guests. A quote does not reserve inventory; payment is
unavailable until sandbox credentials are configured. This is expected with the
safe off-by-default settings above.

For external room photos, use exact approved HTTPS hostnames in
`ROOM_IMAGE_HOSTS` and rebuild/restart. Container builds also need the matching
image-host build argument; see the [staging runbook](../../deploy/staging/README.md).

## 5. Optional integrations, verification and stopping

Use [PayHere setup](../api/payhere-checkout.md) for sandbox credentials and its
public HTTPS callback. A temporary tunnel URL changes when restarted: update the
backend callback setting and use localhost for local Postman requests when the
tunnel is unavailable. A browser success return alone never confirms payment.
Use [confirmation email](../api/booking-confirmation-email.md) and
[enquiries](../api/contact-enquiries.md) for Brevo sandbox configuration. Sandbox
acceptance does not deliver an inbox message. Never commit provider keys.

Run `npm run test:contracts` / `npm run test:security` in `backend` with the
disposable DB configured. They use rollback-only temporary tables and mocked
providers. The full integration command includes other DB tests: point it only
at the disposable database. Pooled race tests additionally require a disposable
localhost CI database and `BOOKING_RACE_TEST=true`; do not set CI flags for a
shared database. Exact commands are in the [demo/test checklist](demo.md).

Stop the dev processes with Ctrl+C, then `docker stop hw-docs-demo-db`. Restart
the same local data with `docker start hw-docs-demo-db`. Keep root Compose
credentials separate; the [container scaffold](../../README.md#local-container-setup)
does not expose its private DB or supply a gateway for host dev servers.

## Walk-through evidence

Documentation commands/scripts and local link targets are checked by
`node scripts/check-release-docs.mjs`. A real fresh-machine Docker/gateway walk-through
and teammate sign-off remain pending. Do not label the deployment or payment
steps as verified until those environments have been exercised and evidence is
recorded in [the demo checklist](demo.md).
