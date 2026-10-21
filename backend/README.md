# Forever Hotel website backend

## Contact enquiries (DDP-#15)

`POST /contact/enquiries` validates enquiries and dispatches plain-text mail via
Brevo when configured. Default `CONTACT_EMAIL_MODE=off` returns 503 without
calling a provider. Use `sandbox` to validate without delivery or `send` for real
dispatch, with server-only `BREVO_API_KEY`, `CONTACT_EMAIL_FROM` (verified
sender) and `CONTACT_EMAIL_TO` (confirmed hotel recipient). No values have been
added to your real `.env` and no real email was sent during implementation.

HTTP 202 `accepted` means provider acceptance, not inbox delivery. `sandbox`
explicitly means no mail was sent. A local five-requests/connection-IP/minute
backstop complements, but cannot replace, trusted gateway per-client rate limits.
See [contact contract](../documents/api/contact-enquiries.md) for full setup,
gateway mapping, timeout/retry limitations and tests.

## Overview

NestJS backend for the **Hotel Website (HW)** subsystem of the Forever Hotel management system: the guest-facing site for room browsing, booking, and guest self-service. See the [repository CLAUDE.md](../CLAUDE.md) for requirements, architecture, and team standards.

The service currently provides the foundation: configuration, PostgreSQL connection, request validation, error handling, structured logging, a health endpoint, and a Docker image. Booking and guest APIs are planned in the project issue backlog. This foundation is also the team's backend template (see [Reusing this as a template](#reusing-this-as-a-template-for-another-subsystem)).

## Structure

For planned guest and booking integrations, see the
[API contract draft](../documents/api/hotel-website-contracts.md). Proposed routes
and ownership require team approval; they are not implemented endpoints.

The code follows the team-agreed backend structure: modules are grouped by business feature, not by client type.

```
src/
├── main.ts / app.module.ts
├── config/     # configuration.ts, env.validation.ts (fails fast), constants.ts
├── database/   # database.module.ts, database.service.ts, postgres-errors.ts, repositories/ (all data access)
├── common/     # filters/ (error body), pipes/ (validation), interfaces/, utils/ (JSON logger)
├── health/     # GET /health
├── guests/     # Guest entity, errors (repository in database/repositories/)
├── room-types/ # RoomType, RoomTypeImage, RoomTypeAmenity, Room entities
└── <feature>/  # bookings/, payments/, ... (to be added)
test/
├── integration/  # real PostgreSQL + Supertest
└── e2e/
```

## Requirements

- Node.js 20.12 or newer and npm (CI and Docker use Node 22)
- A PostgreSQL 16 database you can use for development: a [Neon](https://neon.tech) dev branch or a local PostgreSQL

## Local setup

Run these commands from the `backend` directory:

```powershell
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

For Bash, use `test -f .env || cp .env.example .env`. This keeps any existing local configuration.

Edit **only** your local `.env`. Every variable is explained in `.env.example`:

| Variable                                           | Required | Default         | Notes                                                                                                       |
| -------------------------------------------------- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------- |
| `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | yes      | –               | Database connection details                                                                                 |
| `DB_PORT`                                          | no       | `5432`          |                                                                                                             |
| `DB_SSL`                                           | no       | `false`         | Set to `true` for Neon; the server certificate is verified                                                  |
| `DB_SYNCHRONIZE`                                   | no       | `false`         | Only on a disposable dev database; rejected when `NODE_ENV=production`                                      |
| `DB_LOGGING`                                       | no       | `false`         | Prints SQL queries                                                                                          |
| `SERVICE_NAME`                                     | no       | `hotel-website` | Lowercase kebab-case; appears in logs and the `/health` response                                            |
| `JWT_SECRET`                                       | yes      | –               | Private random signing key, at least 32 bytes; never commit or share                                        |
| `JWT_ISSUER`                                       | yes      | –               | Issuer written into and checked on guest access tokens                                                      |
| `NODE_ENV`                                         | no       | `development`   | `development`, `test` or `production`                                                                       |
| `PORT`                                             | no       | `3000`          |                                                                                                             |
| `LOG_FORMAT`                                       | no       | `text`          | `json` gives structured logs for staging and production                                                     |
| `LOG_LEVEL`                                        | no       | by `NODE_ENV`   | `verbose`, `debug`, `log`, `warn` or `error`; default `debug` in development, `warn` in test and production |

### Using Neon

1. In the Neon console, select your **dev** branch (not `production`) and click **Connect**.
2. Turn **off** "Connection pooling". The app keeps its own connection pool and needs a direct connection.
3. Copy the host, database, role, and password into `.env`, then set `DB_SSL=true`.

The connection string has the form `postgresql://<DB_USERNAME>:<DB_PASSWORD>@<DB_HOST>/<DB_NAME>?sslmode=require`.

### Run

```powershell
npm run start:dev
```

Successful startup logs `Nest application successfully started`. Then check the service:

```powershell
curl http://localhost:3000/health
# {"status":"ok","service":"hotel-website","database":"up"}
```

`/health` returns `503` with `DATABASE_UNAVAILABLE` when the database is unreachable.

### Troubleshooting

- `Invalid environment configuration: ...` lists every missing or invalid variable by name. Check `.env`, and run the command from `backend/`.
- `Unable to connect to the database. Retrying...` means the host or port is wrong or the database is stopped. With Neon, also check `DB_SSL=true`.
- The same message on an **office or corporate network** usually means the firewall blocks outbound PostgreSQL traffic (port 5432), even though the port looks open. Use another network (home Wi-Fi or a mobile hotspot), ask IT to allow `*.neon.tech:5432`, or use a local PostgreSQL. Never disable certificate checks to work around this.
- Authentication errors mean the credentials are wrong. You can reset the password in the Neon console.
- Do not share your `.env` or logs that contain connection details when you ask for help.

## Checks

These match the CI stages:

```powershell
npm run lint           # ESLint, check only (npm run lint:fix applies fixes)
npm run format:check   # Prettier, check only (npm run format rewrites files)
npm run build
npm test               # unit tests (src/**/*.spec.ts)
npm run test:cov       # unit tests + coverage; fails below 80%
npm run test:integration  # needs a real database with the team schema (DB_* from .env or the shell)
```

Unit tests follow Arrange-Act-Assert with `should ... given ...` names. Every new endpoint needs an integration test in `test/integration/`.

Integration tests write real rows, using unique test values, and delete only what they created. Run them against a throwaway database created from `../database/infra-schema/` (CI does this automatically), not the shared Neon branches.

## Request validation

A global `ValidationPipe` validates every request body, query, and route parameter against its DTO, using `class-validator` decorators:

- Unknown properties are **rejected**, not silently kept (`whitelist` + `forbidNonWhitelisted`).
- Payloads become DTO class instances, and parameters get their declared types (`transform`).
- Failures return `400 { "error": "VALIDATION_FAILED", "message": "email must be an email; ..." }`.

All data access lives in `src/database/repositories/` and uses one style: the TypeORM QueryBuilder with bound parameters, for example `.where('guest.email = :email', { email })`. Never build SQL by joining strings. Repository unit tests use the shared fake in `test/unit/query-builder.mock.ts`.

Put DTOs in `<feature>/dto/`, for example `bookings/dto/create-booking.dto.ts`.

## API endpoints

| Method | Path                      | Purpose                                                                                                                           |
| ------ | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/health`                 | Readiness check (database up or `503 DATABASE_UNAVAILABLE`)                                                                       |
| `GET`  | `/room-types`             | Public catalogue with images, amenities, and nightly prices, cheapest first                                                       |
| `GET`  | `/room-types/:roomTypeId` | Public room type details (`400 VALIDATION_FAILED` for an invalid UUID, `404 ROOM_TYPE_NOT_FOUND` for an unknown UUID)             |
| `POST` | `/guests/login`           | Verify guest credentials and issue a 24-hour HS256 bearer token (`200`, `401 INVALID_CREDENTIALS`)                                |
| `POST` | `/guests/register`        | Create a guest account (HW-06): `201`, `400 VALIDATION_FAILED`, `409 EMAIL_ALREADY_REGISTERED`                                    |
| `GET`  | `/guests/me`              | Return the current guest profile; requires `Authorization: Bearer <token>` (`401 UNAUTHORIZED` when missing, invalid, or expired) |

Interactive docs (Swagger UI) are at `http://localhost:3000/docs`, and the OpenAPI JSON at `/docs-json`. They are not served when `NODE_ENV=production`. Describe every new endpoint with `@ApiOperation` and response decorators, and DTO fields with `@ApiProperty`.

Try it from Swagger UI ("Try it out"), or from PowerShell:

```powershell
$body = @{ fullName = 'Nimali Perera'; email = 'nimali@example.com'; password = 'a long passphrase' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/guests/register -ContentType 'application/json' -Body $body
```

Log in with `POST /guests/login` using JSON `{ "email": "...", "password": "..." }`.
Use its `accessToken` as `Authorization: Bearer <token>` when calling
`GET /guests/me`. Tokens expire after 24 hours; log in again after expiry.

The proposed architecture and outstanding team/gateway approvals are recorded in
[ADR 001](../documents/architecture/adr-001-guest-authentication.md).
For integration tests, configure a disposable database loaded from
`database/infra-schema/`, keep `DB_SYNCHRONIZE=false`, and supply `JWT_SECRET`
and `JWT_ISSUER` as documented above. CI generates its own disposable signing
key. Do not run integration tests against production.

## Database tables

### Room catalogue (HW-03, DDP-#11)

`GET /room-types` returns `{ "items": [...], "nextCursor": null }`. This is a
small, fixed catalogue: all seeded room types are returned without pagination.
Each item includes `roomTypeId`, `typeName`, `description`, `pricePerNight`,
`currency`, `maxGuests`, `imageUrls`, and `amenities`. Prices are integer LKR
cents (`250000` means LKR 2,500.00). Missing descriptions are `null`; missing
images and amenities are empty arrays. An empty catalogue returns HTTP 200.

Both routes are public and require no token. Test them with Postman or Swagger
at `/docs`. Use a room type UUID from the list when requesting details.

The shared schema has no publication flag, so all seeded room types are public.
Room types, images, amenities, and prices are maintained through infra-owned
seed data/migrations; this API only reads them. Named maintenance ownership and
gateway mapping still need team agreement. Date-based availability belongs to
the availability feature and is not inferred from the catalogue.

All subsystems share one PostgreSQL database. Its tables are created and changed **only by migrations in the `forever-hotel/infra` repository** (NFR-16). This service never creates or alters tables:

- TypeORM entities must match the infra tables exactly (names, columns, types).
- Keep `DB_SYNCHRONIZE=false`, including in your local `.env` against the team Neon database.
- Need a new column or table? Ask for it in `forever-hotel/infra`, then update the entities here.

For the local Docker Compose database, a read-only copy of the team schema in [`../database/infra-schema/`](../database/infra-schema/) is loaded automatically the first time the database starts (see the root README).

## Docker

The `Dockerfile` builds a small production image (Node 22 Alpine, production dependencies only, non-root user, with a built-in health check on `/health`):

```powershell
docker build -t hotel-website-backend .
docker run --rm -p 3000:3000 --env-file .env hotel-website-backend
```

The image never contains `.env`; configuration is passed at runtime.

## Logging

Use Nest's `Logger` with the class name as context (`new Logger(GuestRepository.name)`), and pick the level by meaning:

| Level     | Use for                          | Example                                               |
| --------- | -------------------------------- | ----------------------------------------------------- |
| `verbose` | Step-by-step trace               | `Inserting guest account`                             |
| `debug`   | Developer detail, results        | `Loaded 4 room types`                                 |
| `log`     | Normal business events           | `Guest account created: <uuid>`                       |
| `warn`    | Expected failures worth noticing | `Guest account not created: email already registered` |
| `error`   | Unexpected failures              | `Loading room types failed: QueryFailedError`         |

In repositories, wrap each query in `try/catch`: log what failed with `errorName(error)` (the class name only) and rethrow. The global exception filter logs the stack once and answers the client. Never log names, emails, phones, passwords, tokens or raw database messages; use UUIDs.

## Error responses

Every error uses the team format, and stack traces are never returned to clients:

```json
{ "error": "BOOKING_NOT_FOUND", "message": "Booking was not found." }
```

To return a specific code, throw a Nest HTTP exception with a code-style `error`, for example `new NotFoundException({ error: 'BOOKING_NOT_FOUND', message: '...' })`. Otherwise the code comes from the HTTP status, such as `NOT_FOUND`.

## Configuration and secrets

- `backend/.env` and other `.env*` files are ignored by Git; `backend/.env.example` is the only tracked backend template. Add every new variable to it with a placeholder value.
- Never commit passwords, API keys, personal data, or payment details. Use GitHub Secrets in CI.
- `JWT_SECRET` must be a private random value of at least 32 bytes. `JWT_ISSUER` identifies the token issuer. Never log signing keys or access tokens, and never return the signing key. Return access tokens only in the successful login response.
- `DB_SYNCHRONIZE` is `false` by default. Schema changes go through `forever-hotel/infra` migrations (NFR-16).

From the repository root, verify the ignore rules before committing:

```powershell
git check-ignore -v backend/.env backend/.env.local backend/.env.production
git ls-files -- backend/.env backend/.env.local backend/.env.production
git status --short --untracked-files=all
```

The first command should list an ignore rule for all three paths, and the second should print nothing. Never use `git add -f` on environment files.

## Reusing this as a template for another subsystem

The folders `config/`, `database/`, `common/`, and `health/`, plus the test setup, `Dockerfile`, lint and format configuration, and `.github/` templates, are shared by every subsystem backend. Feature folders (for example `bookings/`) are not. To start another subsystem from this code:

1. Copy `backend/` without `node_modules`, `dist`, `coverage`, or `.env`, and copy `.github/` from the repository root.
2. Set `SERVICE_NAME` in `.env.example` (for example `front-desk`), and pick a different default `PORT`.
3. Update `name` and `description` in `package.json`, and the first section of this README.
4. Remove `CHANGELOG.md` entries that belong to this service.
5. Run `npm ci`, `npm run lint`, and `npm test` to confirm everything passes.

## Date-based availability

The public availability API and calendar are documented in
[the availability contract](../documents/api/availability.md), including gateway
paths, date rules, errors, inventory policy and verification commands.
