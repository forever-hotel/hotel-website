# Changelog

All notable changes to the Hotel Website backend are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- Guest authentication build and lint errors, Swagger test guard setup, and typed integration-test response handling (DDP-#10). Formatting checks now use the same line-ending policy as ESLint. Backend CI enforces formatting and the existing 80% unit coverage threshold.
- Documented the proposed per-service authentication architecture in ADR 001; team and gateway approval remain pending.

### Added

- Contact enquiry endpoint (DDP-#15): validated plain-text Brevo dispatch,
  default-off delivery, explicit sandbox/accepted responses, request timeouts,
  and a bounded per-connection-IP rate-limit backstop. No enquiry body or provider
  secret is logged; production ingress per-client limits remain with the gateway.
- Public room catalogue endpoints (HW-03, DDP-#11): `GET /room-types` and `GET /room-types/:roomTypeId` return names, descriptions, images, amenities, capacity, and prices in LKR cents. Invalid UUIDs return `400 VALIDATION_FAILED`; unknown UUIDs return `404 ROOM_TYPE_NOT_FOUND`. Includes Swagger documentation, service/HTTP checks, and database-backed API integration checks.
- `POST /guests/login` (HW-07, DDP-#10): verifies a submitted password against the stored bcrypt hash and issues a signed HS256 JWT with `iss`, `sub`, `iat`, `exp`, and `role=GUEST` claims and a 24-hour expiry. Adds `GET /guests/me`, protected by a bearer-token guard, plus validated `JWT_SECRET` and `JWT_ISSUER` configuration.
- `POST /guests/register` (HW-06, DDP-#09): validates name, email, password (8–72 characters) and optional phone (SDS Table 14), stores the password as a bcrypt hash (cost 12, `bcryptjs`), returns `201` with `{ guestId, fullName, email, createdAt }`, `409 EMAIL_ALREADY_REGISTERED` for a used email and `400 VALIDATION_FAILED` for invalid input.
- Startup rejects a connection URL in `DB_HOST` (only a host name is allowed), so a pasted `postgresql://user:password@...` link cannot leak the password into logs. Integration tests get a 30-second timeout for cloud databases and close cleanly when the database is unreachable.
- Swagger/OpenAPI docs at `/docs` (JSON at `/docs-json`), not served when `NODE_ENV=production`.
- `npm overrides` pins `js-yaml` 5.4.3 under `@nestjs/swagger` to avoid a high-severity advisory in 5.3.0.

- Guest and room data layer (DDP-#08): TypeORM entities for `guests`, `room_types`, `room_type_images`, `room_type_amenities` and `rooms` that map onto the infra schema, and `GuestRepository`, `RoomTypeRepository` and `RoomRepository` in `database/repositories/`. Emails are stored lowercase, password hashes are never returned, and duplicate emails raise `EmailAlreadyRegisteredError`.
- Unit test that fails when an entity column does not match the team schema copy.
- `LOG_LEVEL` setting (`verbose`, `debug`, `log`, `warn`, `error`) with defaults per environment: `debug` in development, `warn` in test and production (SDS Table 20).
- Repository logging: each query runs in `try/catch`, logs trace, debug, event, warning and error messages with UUIDs only, and rethrows; `errorName()` logs only the error class name.
- Startup failures after the app is built (for example the port is already in use) are logged at `fatal` level through the shared logger and exit with code 1.
- Team rule: every repository query uses the TypeORM QueryBuilder with bound parameters; shared QueryBuilder fake for unit tests (`test/unit/query-builder.mock.ts`).
- Backend CI integration job: a `postgres:16` service loaded with the team schema runs `npm run test:integration`.

- Local Compose database and container CI load a read-only copy of the team schema (`database/infra-schema/`) on first start; CI checks the shared tables exist.

- Local Compose stack with private backend/database networking, frontend standalone image, container health verification workflow and deployment instructions (DDP-#07).

- Hotel website API contract draft covering rooms, availability, guest authentication, bookings, promotions and payments, with examples and a pending cross-team approval log. No business endpoints are implemented by this documentation change.

- Global request validation (`class-validator`) with `400 VALIDATION_FAILED` errors that reject unknown properties.
- `SERVICE_NAME` environment variable used in logs and `/health`.
- Multi-stage `Dockerfile` (Node 22 Alpine, non-root, health check) and `.dockerignore`.
- GitHub pull request and issue templates in the SENG 34213 format.
- `engines.node >= 20.12` in `package.json`.
- Team-agreed backend structure: `config/`, `database/`, `common/`, `health/`, and `test/integration/`.
- Environment validation that fails fast on startup and names invalid variables without printing their values.
- Optional TLS for PostgreSQL (`DB_SSL`) with certificate verification, for Neon and other cloud databases.
- `GET /health` readiness endpoint, which checks the database and returns `503 DATABASE_UNAVAILABLE` when it is unreachable.
- Global exception filter that returns `{ "error", "message" }` bodies and never exposes stack traces.
- Structured JSON logging with the service name (`LOG_FORMAT=json`).
- Unit tests with an 80% coverage gate, and an integration test for `/health`.
- `lint:fix`, `format:check`, and `test:integration` npm scripts.

### Changed

- The exception filter answers only HTTP requests; other contexts are logged and left to their own transport filters.
- Tables are owned by `forever-hotel/infra` migrations. Removed this repo's migration scripts, `data-source.ts`, `typeorm-options.ts` and `src/database/migrations/`; connection options live in `database.module.ts`.
- Startup logs print immediately, and stuck database connections time out after 10 seconds.
- `npm run lint` now only checks and no longer rewrites files. Use `npm run lint:fix` to apply fixes.
- `DB_SYNCHRONIZE` and `DB_LOGGING` are now configurable and default to `false`. Synchronize is rejected in production.
- TypeORM loads entities registered by feature modules (`autoLoadEntities`).
- Jest configuration moved to `jest.config.ts`.

### Removed

- Starter "Hello World" controller, service, and e2e test.
