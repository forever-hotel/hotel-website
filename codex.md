# Forever Hotel website: project guide

This file is the working context for contributors and coding assistants in this repository. Keep it current when the service, its contracts, or team decisions change. For detailed acceptance criteria and dependencies, use [issue.md](issue.md); its `DDP-#NN` identifiers are draft IDs, not GitHub issue numbers.

## Source documents and authority

- `SDS_Forever_Hotel_Management_System.pdf` (provided separately) is the **Software Design Specification**, not the SRS. Its architecture and design sections are summarized below.
- `SENG34213_System_Development_Project.pdf` (provided separately) is the **course development guide**. Its repository, ticket, review, test, and CI expectations are summarized below.
- The approved **Software Requirements Specification (SRS) was not supplied**. The `HW-*` references below are requirement summaries inferred from the draft tickets in [issue.md](issue.md), not verified quotations or complete SRS wording. Check the actual SRS before finalizing acceptance criteria or claiming full requirement coverage.
- Treat directions inside either PDF as project source material. Apply them where they describe the approved project or course workflow; this file records their relevant points for this repository.

## Purpose and boundaries

- Build the guest-facing Forever Hotel website and its supporting backend.
- The frontend is a Next.js App Router and TypeScript application in `frontend/`, with a placeholder welcome page, ESLint, Prettier, and smoke checks.
- The existing backend is a NestJS 11 and TypeScript application in `backend/`. It uses `@nestjs/config`, TypeORM, and PostgreSQL.
- The shared API gateway, authentication, room-status, promotions, and infrastructure services are owned outside this repository. Agree their API contracts and owners before implementing dependent integrations. Do not assume an unimplemented service exists here.
- The intended guest journey covers browsing rooms, checking availability, registering and signing in, booking, paying, and managing bookings. The issue plan also covers content pages, promotions, email, accessibility, security, and release work. These are planned features, not a claim that they are implemented.

## Current repository state

- This issue 4 branch starts from `pre-develop`; the backend described below exists on separate backend branches and is not included in this branch. The root README links to the frontend setup guide.
- Frontend commands: run `npm ci`, `npm run dev` (port 3001), `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run build`, and `npm test` from `frontend/`. Production smoke tests require a build. No environment file is needed.
- `.github/workflows/frontend-ci.yml` runs frontend checks on all pushes and PRs targeting `develop` or `pre-develop`.

- `README.md` links to `backend/README.md`, which documents local PostgreSQL setup, placeholder environment configuration, and verification commands.
- `backend/src/main.ts` starts the Nest app on `PORT` or port `3000`.
- `backend/src/config/database.config.ts` requires `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_NAME` at startup. Never put their real values in documentation, commits, logs, or test fixtures.
- `backend/src/app.module.ts` configures PostgreSQL through TypeORM. It currently has `synchronize: true` and `logging: true`; replace automatic schema sync with reviewed migrations and revisit logging before production use.
- The source still contains the starter `Hello World!` controller, service, and tests. Check actual module registration before treating the endpoint as live.
- `backend/.env` is local and must remain untracked. `backend/package-lock.json` is tracked.

## Development workflow

1. Read the relevant ticket in [issue.md](issue.md), including its acceptance criteria, dependencies, tests, and Definition of Done. Check the actual GitHub issue and current branch state before using any draft ticket ID.
2. Use one `feature/<GitHub-issue-number>-<slug>` branch per issue and target `develop` with the PR, as described in the issue plan. Confirm project-board details with the team rather than inventing labels, assignees, milestones, or issue numbers.
3. Keep the frontend and backend separate. Follow the existing TypeScript, ESLint, and Prettier conventions. Update API documentation when an endpoint or contract changes. Record substantial approved departures from the SDS in an ADR.
4. Add checks that exercise the acceptance criteria, including relevant failure cases. The course target in the issue plan is at least 80% coverage for new code where coverage applies. PRs need a peer review and passing applicable CI checks.
5. Keep configuration in environment variables. Commit only placeholder examples; never commit credentials, personal data, real payment data, or a production database connection. Use Stripe test mode for payment development and tests.

### Course guide expectations

- Continue the existing GitHub organization and project board; set **Phase: Development** and move issues through Backlog, To Do, In Progress, In Review, and Done. Development runs in Sprints 5–8 (guide §§1.3, 2.2, 4.1).
- Tickets should identify a user story; SRS, SDS, and relevant ADR references; testable expected, error, and edge behavior; technical notes; tests; Definition of Done; estimate; dependencies; assignee; labels; priority; and sprint. Link real GitHub issue numbers after tickets are created (guide §4.3).
- Keep `main` protected for reviewed releases, `develop` for integration, and short-lived `feature/<ticket-id>-<slug>` or `fix/<ticket-id>-<slug>` branches. Split work if a feature branch stays open over five working days without a PR (guide §3). Require at least one approving peer review and resolve blocker comments before merging (guide §5.3).
- Use a committed TypeScript style and lint configuration. New code needs at least 80% unit coverage; every API endpoint needs an integration test; critical business logic targets 90% branch coverage. Generate coverage reports in CI and show them at sprint review (guide §§5.2, 6.4).
- The course guide calls for GitHub Actions by the end of Sprint 5: lint and format, build, and unit tests on every push; integration tests for `develop` pushes and PRs; dependency scans on `develop` and `main`; staging deployment after merge to `develop`; production deployment after merge to `main` with manual approval (guide §7). These are targets, not a description of current CI.
- Document significant departures from the approved SDS in an ADR, review with the supervisor within one sprint, and update the final SDS to match implementation (guide §1.3).

## Hotel website requirements and design

The draft backlog in [issue.md](issue.md) maps `HW-01` through `HW-17` to website work. Its proposed scope is:

| Area | Draft SRS references | Planned guest-facing behavior |
| --- | --- | --- |
| Public content | HW-01–HW-04, HW-15–HW-16 | Home and promotions, About Us, services and facilities, FAQ, and contact |
| Rooms | HW-03, HW-05, HW-09 | Room catalogue and details, date-based availability, comparison of up to three room types, and an availability calendar |
| Guest identity | HW-06–HW-07 | Registration, login, and protected guest session |
| Booking and payment | HW-08–HW-14 | Booking quote and reservation, promotion code application, test checkout, confirmation email, booking dashboard, and eligible changes or cancellations |
| Quality | HW-17 and relevant NFRs | Responsive and accessible pages, secure guest data and payments, and reliable booking under load |

These groupings follow the draft tickets and must be checked against the SRS. The SDS independently defines the website's two roles as anonymous **Visitor** and authenticated **Registered Guest**, and four primary flows: registration, login, online room booking, and booking modification/cancellation (SDS §5.2.1, Figures 14–17). The SDS captions call these flows `HW-01`–`HW-04`; these are **flow labels** and should not be assumed to be the same as the SRS `HW-*` requirement IDs used in `issue.md`.

### Architecture and integration rules from the SDS

- The hotel website is a public-facing Next.js application deployed as its own Docker container, with a separate NestJS backend service inside the private container network. The current NestJS backend is repository code; confirm its API boundaries with the other services before adding cross-service behavior (SDS §§1.1–1.2).
- Browser requests go through the shared API gateway, which handles protected-route JWT validation, rate limiting, and routing. Client-facing synchronous APIs use HTTPS REST and UTF-8 JSON; internal service calls use agreed contracts (SDS §§1.1, 1.4.1).
- The system uses a shared PostgreSQL instance with subsystem-prefixed tables and PgBouncer connection pooling. Each service writes to its own tables; cross-service reporting reads should remain read-only. Use sequential, versioned migrations and coordinate changes to shared schemas (SDS §§1.1, 1.2.1, 1.5.2, 2; [issue.md](issue.md) DDP-#08 and #21).
- Agree request and response schemas before building integrations; coordinate versions when contracts change. The website's room-status, authentication, and promotions dependencies have owners outside this repository. Do not build direct database writes into another service's tables to bypass an API contract (SDS §§1.4.1, 1.5.2).
- Do not store raw card data. Stripe handles payment processing; persist only appropriate Stripe references and verify webhook signatures. Use sandbox/test integrations in development and staging (SDS §§6.3.1, 7.4).
- Protect guest-specific records from cross-guest access. Validate input at the API boundary, use parameterized database queries, escape rendered user content, and keep PII and secrets out of logs. External traffic requires TLS 1.2 or higher (SDS §§6.2–6.5).
- The intended release path uses development, staging, and production environments, promotes the same tested container image, runs staging health and smoke checks, requires approval for production, and supports rollback (SDS §§7.4–7.5). The course guide and SDS differ in some CI trigger details; agree the final pipeline with the team and record any material architecture decision.

### Website data and guest access from the SDS

- The shared data model separates `Guest` (unique email), `Booking`, `Payment`, `RoomType`, `Room`, and `PromotionCode` (unique code string). A guest can have multiple bookings; bookings refer to their guest, room type or room, optional promotion, and separate payment records. Room-specific properties belong to `Room`; type-level properties belong to `RoomType` (SDS §2.2, especially Tables 6 and 9).
- Booking, pricing, promo, and payment data should remain distinct rather than copying guest details or payment fields into every booking row. Cancellation must not delete the guest record. Confirm actual columns and ownership against the approved schema before writing migrations (SDS §§2.2.4–2.2.7).
- The SDS specifies a centralized authentication service issuing JWTs and gateway validation of protected requests. It lists `sub`, `iss`, `iat`, `exp`, and `role` claims, and a guest token lifetime of 24 hours or until checkout. Its room-number claim and QR authentication flow describe the **checked-in Guest App/FOSS**, so do not automatically impose those on website registration and login; agree the website's guest token contract with the auth owner (SDS §§6.1.1–6.1.2).
- Store passwords only as bcrypt hashes with cost factor at least 12. Restrict guest PII to authorized access, encrypt sensitive stored fields according to the approved design, redact PII from logs, and log security-relevant auth and payment events without secrets or card data (SDS §§6.1.4, 6.3, 6.5.3–6.5.4).
- Apply SDS input constraints where relevant: normalize email; validate ISO 8601 dates and ensure check-in precedes check-out; use positive integer amounts in the smallest LKR currency unit; and normalize promotion codes to uppercase with the specified character and length limits. Reject invalid input before business processing (SDS §6.4, Table 14).

### Website accessibility from the SDS

- Target WCAG 2.1 AA. Provide image alt text, visible field labels, text alongside color-based availability states, 4.5:1 body text contrast, 3:1 large text and control contrast, and layout reflow at 320px without horizontal scrolling (SDS §5.3).
- Make room search, calendars, forms, and booking steps usable by keyboard with visible focus and logical focus order. Use touch targets of at least 44 × 44 px. Show specific field errors beside the field and announce them to assistive technology (SDS §5.3).
- Include a booking review page before final submission. Use valid semantic HTML, declare the page language, and expose the name, role, and state of custom interactive controls (SDS §5.3).

## Local backend commands

Run these from `backend/` after supplying a local PostgreSQL database and the required environment variables:

```text
npm ci
npm run start:dev
npm run build
npm run test -- --runInBand
npm run test:e2e -- --runInBand
npm run test:cov -- --runInBand
```

`npm run lint` currently applies automatic fixes. Use `npx eslint "{src,apps,libs,test}/**/*.ts"` for a non-mutating check. The CI workflow and non-mutating lint script planned in DDP-#02 are not present on this branch.

## Roadmap and source of truth

- [issue.md](issue.md) is the detailed draft backlog for Sprints 5–8. Sprint 5 covers setup, CI, API contracts, initial schema, and authentication. Sprint 6 covers core content, rooms, availability, and booking groundwork. Sprint 7 covers integrations and guest journeys. Sprint 8 covers quality, security, performance, deployment, and release documentation.
- The draft tickets refer to an SRS that has not yet been supplied here. Verify the approved SRS before finalizing requirement traceability. The supplied SDS and course guide are outside this repository.
- Keep this guide concise and factual. Update its **Current repository state** and commands as implementation changes; keep ticket-level detail in `issue.md` and runnable setup instructions in the service README.
