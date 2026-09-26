# Forever Hotel website backend

NestJS backend for the **Hotel Website (HW)** subsystem of the Forever Hotel management system: the guest-facing site for room browsing, booking, and guest self-service. See the [repository CLAUDE.md](../CLAUDE.md) for requirements, architecture, and team standards.

The service currently provides the foundation: configuration, PostgreSQL connection, request validation, migrations, error handling, structured logging, a health endpoint, and a Docker image. Booking and guest APIs are planned in the project issue backlog. This foundation is also the team's backend template (see [Reusing this as a template](#reusing-this-as-a-template-for-another-subsystem)).

## Structure

The code follows the team-agreed backend structure: modules are grouped by business feature, not by client type.

```
src/
├── main.ts / app.module.ts
├── config/     # configuration.ts, env.validation.ts (fails fast), constants.ts
├── database/   # database.module.ts, typeorm-options.ts, data-source.ts (CLI), migrations/, repositories/
├── common/     # filters/ (error body), pipes/ (validation), interfaces/, utils/ (JSON logger)
├── health/     # GET /health
└── <feature>/  # bookings/, room-types/, ... (to be added)
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

| Variable                                           | Required | Default         | Notes                                                                  |
| -------------------------------------------------- | -------- | --------------- | ---------------------------------------------------------------------- |
| `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | yes      | –               | Database connection details                                            |
| `DB_PORT`                                          | no       | `5432`          |                                                                        |
| `DB_SSL`                                           | no       | `false`         | Set to `true` for Neon; the server certificate is verified             |
| `DB_SYNCHRONIZE`                                   | no       | `false`         | Only on a disposable dev database; rejected when `NODE_ENV=production` |
| `DB_LOGGING`                                       | no       | `false`         | Prints SQL queries                                                     |
| `SERVICE_NAME`                                     | no       | `hotel-website` | Lowercase kebab-case; appears in logs and names the migrations table   |
| `NODE_ENV`                                         | no       | `development`   | `development`, `test` or `production`                                  |
| `PORT`                                             | no       | `3000`          |                                                                        |
| `LOG_FORMAT`                                       | no       | `text`          | `json` gives structured logs for staging and production                |

### Using Neon

1. In the Neon console, select your **dev** branch (not `production`) and click **Connect**.
2. Turn **off** "Connection pooling". The app keeps its own connection pool, and migrations need a direct connection.
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
npm run test:integration  # needs a real database from .env (use your Neon dev branch)
```

Unit tests follow Arrange-Act-Assert with `should ... given ...` names. Every new endpoint needs an integration test in `test/integration/`.

## Request validation

A global `ValidationPipe` validates every request body, query, and route parameter against its DTO, using `class-validator` decorators:

- Unknown properties are **rejected**, not silently kept (`whitelist` + `forbidNonWhitelisted`).
- Payloads become DTO class instances, and parameters get their declared types (`transform`).
- Failures return `400 { "error": "VALIDATION_FAILED", "message": "email must be an email; ..." }`.

Put DTOs in `<feature>/dto/`, for example `bookings/dto/create-booking.dto.ts`.

## Database migrations

Schema changes go through versioned migrations (NFR-16). All subsystems share one database, so each service records its migrations in its own table (`<service_name>_migrations`, for example `hotel_website_migrations`). Migration files live in `src/database/migrations/`.

```powershell
npm run migration:generate -- src/database/migrations/CreateBookings   # diff entities against the DB
npm run migration:create -- src/database/migrations/SeedRoomTypes      # empty migration to write by hand
npm run migration:run      # apply pending migrations
npm run migration:revert   # undo the last migration
npm run migration:show     # list applied and pending migrations
```

These commands use `src/database/data-source.ts`, which reads the same `.env` as the app. Review every generated migration before committing it. On a shared branch (the team Neon `dev` or `production` branch), keep `DB_SYNCHRONIZE=false` and use migrations only.

## Docker

The `Dockerfile` builds a small production image (Node 22 Alpine, production dependencies only, non-root user, with a built-in health check on `/health`):

```powershell
docker build -t hotel-website-backend .
docker run --rm -p 3000:3000 --env-file .env hotel-website-backend
```

The image never contains `.env`; configuration is passed at runtime. To apply migrations inside the container, run `npm run migration:run:prod`.

## Error responses

Every error uses the team format, and stack traces are never returned to clients:

```json
{ "error": "BOOKING_NOT_FOUND", "message": "Booking was not found." }
```

To return a specific code, throw a Nest HTTP exception with a code-style `error`, for example `new NotFoundException({ error: 'BOOKING_NOT_FOUND', message: '...' })`. Otherwise the code comes from the HTTP status, such as `NOT_FOUND`.

## Configuration and secrets

- `backend/.env` and other `.env*` files are ignored by Git; `backend/.env.example` is the only tracked template. Add every new variable to it with a placeholder value.
- Never commit passwords, API keys, personal data, or payment details. Use GitHub Secrets in CI.
- `DB_SYNCHRONIZE` is `false` by default. Schema changes for shared databases must use versioned migrations (NFR-16).

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
