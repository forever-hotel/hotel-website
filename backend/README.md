# Forever Hotel website backend

NestJS backend for the guest-facing hotel website. It currently connects to PostgreSQL and contains starter application code; booking and guest APIs are planned in the project issue backlog.

## Requirements

- Node.js 20 or newer and npm
- A PostgreSQL server and a database/user you can use for local development

## Local setup

Run these commands from the `backend` directory:

```powershell
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Edit **only** your local `.env` file. Set `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_NAME` to your local PostgreSQL connection details. `DB_PORT` must be a numeric port, usually `5432`. `PORT` is optional and defaults to `3000`. Start PostgreSQL and ensure the named database exists before starting the app.

```powershell
npm run start:dev
```

For Bash, use `test -f .env || cp .env.example .env` instead of the PowerShell copy command. This preserves existing local configuration. The `.env.example` values are placeholders, not usable credentials. Ask your team for local development access if you do not have a database user; never copy production credentials into this file.

Successful startup logs `Nest application successfully started`. No controller is currently registered in `AppModule`, so a request to `/` returns 404; it is not a health endpoint.

If startup reports `DB_* is not defined`, check that all five required variables are set and that you ran the command from `backend/`. Connection errors usually mean PostgreSQL is stopped, the host/port is incorrect, or the database/user has not been created. Authentication errors require checking your local database credentials. Do not share your `.env` or logs containing connection details when requesting help.

## Checks

```powershell
npm run build
npx eslint "{src,apps,libs,test}/**/*.ts"
npx jest --runInBand
```

The direct ESLint command checks without editing files. On the backend setup branch, `npm run lint` still applies `--fix`; use the direct command until the CI lint change is merged. These checks do not need a database connection or real secrets.

The starter `test:e2e` suite needs PostgreSQL and still expects a registered `/` endpoint. It does not currently provide a passing setup smoke test.

## Configuration and secrets

- `backend/.env` and other `.env*` files are ignored by Git; `backend/.env.example` is the only tracked environment template. Check with `git check-ignore -v backend/.env` from the repository root.
- Do not commit passwords, API keys, personal data, or payment details. Use environment variables or your team's approved secret store for non-local environments.
- The current TypeORM setup has `synchronize: true` and `logging: true`. Use only a disposable local database until versioned migrations and production-safe logging are implemented. Do not point this starter backend at production data.

From the repository root, verify the ignore rules before committing:

```powershell
git check-ignore -v backend/.env backend/.env.local backend/.env.production
git ls-files -- backend/.env backend/.env.local backend/.env.production
git status --short --untracked-files=all
```

The first command should list ignore rules for all three paths; the second should print nothing. The real environment files must not appear in status. `backend/.env.example` should remain available to commit. Never use `git add -f` on environment files, and review the staged diff locally before committing.
