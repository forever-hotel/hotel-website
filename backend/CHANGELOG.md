# Changelog

All notable changes to the Hotel Website backend are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Global request validation (`class-validator`) with `400 VALIDATION_FAILED` errors that reject unknown properties.
- TypeORM migrations (`migration:generate|create|run|revert|show`, `migration:run:prod`), with a per-service migrations table for the shared database.
- `SERVICE_NAME` environment variable used in logs, `/health`, and the migrations table name.
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
- Database connection options are shared between the app and the migrations CLI (`typeorm-options.ts`).
- Startup logs print immediately, and stuck database connections time out after 10 seconds.
- `npm run lint` now only checks and no longer rewrites files. Use `npm run lint:fix` to apply fixes.
- `DB_SYNCHRONIZE` and `DB_LOGGING` are now configurable and default to `false`. Synchronize is rejected in production.
- TypeORM loads entities registered by feature modules (`autoLoadEntities`).
- Jest configuration moved to `jest.config.ts`.

### Removed

- Starter "Hello World" controller, service, and e2e test.
