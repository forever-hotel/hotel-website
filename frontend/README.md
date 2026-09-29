# Forever Hotel frontend

Next.js App Router scaffold with TypeScript, ESLint, and Prettier. The welcome
page is a placeholder for later website features. No backend, database, external
fonts, environment files, or credentials are required.

## Agreed frontend structure

Refer to the [team's frontend folder structure standard](FRONTEND_STRUCTURE.md)
when implementing or reorganizing the frontend. It preserves the supplied Word
document, including the common skeleton, hotel website routes and feature modules,
naming rules, and API, testing and deployment conventions.

This is the target structure for future work; the current application is still a
scaffold. Start with sections 3–6 for this frontend and review section 26 for
decisions the source document still marks for team confirmation.

## Local setup

Install Node.js 22 or newer and npm. From the repository root:

```sh
cd frontend
npm ci
npm run dev
```

Open http://localhost:3001. Port 3001 leaves port 3000 available for the NestJS
backend. Stop the development server with Ctrl+C before starting production on
the same port. If the port is occupied, stop the other process or run
`npx next dev --port 3002`.

## Verification

Run from `frontend/`:

```sh
npm run lint
npm run format:check
npm run typecheck
npm run build
npm test
npm start
```

The smoke test starts and stops its own production server on a temporary port.
It checks that `/` returns HTTP 200 with the welcome heading, page title, and
English language declaration, and an unknown route returns HTTP 404. Build
before running it. To smoke-test development startup in PowerShell:

```powershell
$env:SMOKE_MODE = 'dev'
npm test
Remove-Item Env:SMOKE_MODE
```

In Bash, use `SMOKE_MODE=dev npm test`. `npm start` serves the production build
at http://localhost:3001. No unit coverage target applies to this static scaffold;
add unit coverage as behavior is introduced.

CI installs from the committed lockfile and runs lint, format, type, build, and
production smoke checks on pushes and PRs to `develop` or `pre-develop`.

## Conventions

- Keep application routes and layouts in `src/app/`; use `@/` for `src/` imports.
- TypeScript strict mode is enabled. Lint does not modify files.
- Use `npm run format` to apply single quotes and trailing commas consistently.
- Keep `.next/`, `node_modules/`, and generated TypeScript files out of Git.
  Next.js regenerates `next-env.d.ts` during dev, build, or type generation.
- Future browser API requests must use the agreed shared gateway contract.
  Never put secrets in client code or `NEXT_PUBLIC_*` variables.

## Issue 4 verification evidence

Local checks passed with Node.js 22.14.0 and npm 10.9.2:

- ESLint, Prettier check, TypeScript check, and production build.
- Development and production smoke checks: home page HTTP 200 and unknown
  route HTTP 404.
- Clean-copy check: copied only Git-visible frontend files to a temporary
  directory without `node_modules`, `.next`, or `next-env.d.ts`; `npm ci --offline`
  from the populated npm cache, production build, and smoke test all passed.
  A fresh machine uses the documented `npm ci` to download those locked packages.

The GitHub Actions run and peer review remain pending until this branch is pushed
and a PR is opened.
