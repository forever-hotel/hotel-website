# CLAUDE.md — Forever Hotel: Hotel Website (HW) service

This file gives Claude Code (and new team members) the context needed to work in this repository. It is distilled from these documents, plus the work log in §13:

- **SRS** — *Forever Hotel Software Requirements Specification* v1.0 (2026-03-22, client-approved 2026-02-13)
- **SDS** — *Forever Hotel Software Design Specification* v1.0 (2026-04-18)
- **Course guideline** — *SENG 34213 System Development Project: Course Guideline & Industrial Standards* v1.0 (University of Kelaniya)
- **Team backend standard** — *Forever City Hotel Backend Folder Structure Guide* (team-agreed; binding for code layout, see §9)

When the documents disagree, see [Open decisions](#open-decisions-and-document-conflicts). Do not silently pick one; raise it, and record significant deviations from the SDS as an ADR (course rule §1.3).

---

## 1. What this repository is

Forever Hotel is a microservices hotel management system for **Forever City Hotel** (No. 243/3, Makola Road, Kiribathgoda, Sri Lanka). It has six independently deployable subsystems:

| Code | Subsystem | Audience | Network |
|---|---|---|---|
| **HW** | **Hotel Website — this repo** | Visitors and registered guests | Public internet |
| MAD | Manager Analytical Dashboard | Hotel manager | Internal |
| FDS | Front Desk System | Receptionists | Internal |
| FOSS | Guest App (food ordering and service requests, PWA) | Checked-in guests | Public |
| KMS | Kitchen Management System | Kitchen staff and kitchen manager | Internal |
| WKMS | Worker Management System (PWA) | Housekeeping and maintenance workers | Internal |

**HW scope:** the public hotel website. It covers hotel information pages, room browsing and comparison, availability calendars, guest registration and login, online booking with promo codes and Stripe payment, confirmation emails through SendGrid, and guest self-service (view, modify, or cancel bookings).

**Out of scope for HW:** check-in and check-out, walk-in bookings, Booking.lk import (FDS), creating promotions (MAD), food ordering (FOSS), staff accounts (MAD). HW *reads* promotions created in MAD. Bookings made in HW are later *used by* FDS at check-in.

**System-wide out of scope (SRS §1.2):** accounting and payroll, non-food inventory, channel managers other than Booking.lk, native mobile apps, hardware setup, and loyalty programmes.

### Team
Rashmika Nethsarani (SE/2021/017), Rasadhi Sanchala (SE/2021/021), Hiruni Ramanayaka (SE/2021/024), Viduni Niketha (SE/2021/044), Pubudu Madushan (SE/2021/060). GitHub organisation: `forever-hotel`.

---

## 2. Current state of the code

The backend foundation follows the team-agreed structure (§9). No business feature modules exist yet.

```
hotel-website/
├── README.md, CLAUDE.md
├── .github/                # pull_request_template.md, ISSUE_TEMPLATE/ (course [DDP-#NN] format); CI workflow lives on feature/42-backend-ci
├── .gitignore              # ignores node_modules, dist, coverage, .env* (keeps .env.example)
└── backend/                # NestJS 11 + TypeORM 0.3 + pg
    ├── .env.example        # every variable documented (SERVICE_NAME, NODE_ENV, PORT, LOG_FORMAT, DB_*, DB_SSL, DB_SYNCHRONIZE, DB_LOGGING)
    ├── Dockerfile, .dockerignore   # multi-stage Node 22 Alpine, prod deps only, non-root, HEALTHCHECK on /health
    ├── CHANGELOG.md        # keep [Unreleased] up to date (DoD)
    ├── jest.config.ts      # unit tests, 80% coverage threshold
    ├── src/
    │   ├── main.ts                      # early AppLogger from process env, then switches to validated config; listens on app.port
    │   ├── app.module.ts                # ConfigModule(load: configuration) + DatabaseModule + HealthModule; APP_FILTER AllExceptionsFilter, APP_PIPE validation
    │   ├── config/                      # constants.ts, env.validation.ts (fail-fast, never prints values), configuration.ts (typed app/database sections)
    │   ├── database/                    # typeorm-options.ts (shared app/CLI options), database.module.ts, data-source.ts (migrations CLI), migrations/, repositories/, database.service.ts
    │   ├── common/                      # filters/all-exceptions.filter.ts ({error,message}, HTTP only), pipes/validation.pipe.ts (VALIDATION_FAILED), interfaces/, utils/app-logger.ts
    │   └── health/                      # GET /health -> 200 {status,service,database} | 503 DATABASE_UNAVAILABLE
    └── test/
        ├── integration/health.integration-spec.ts   # needs a real DB (Neon dev branch or local)
        ├── jest-integration.json
        └── jest-e2e.json                              # e2e/ folder, empty until the frontend exists
```

Development database: **Neon** (free plan, Singapore). Use a `dev` branch, not `production`, with the direct (non-pooled) connection and `DB_SSL=true`. This departs from the SDS (Dockerised PostgreSQL on the VPS), so it needs an ADR.

There is **no frontend yet**. The SDS specifies a Next.js frontend for HW. The team-agreed repository pattern puts it in `frontend/` next to `backend/` (§9); justify the combined repo in an ADR as the course requires.

This foundation doubles as the team's backend template; the README explains how to reuse it for another subsystem. `SERVICE_NAME` (env) identifies the service in logs, `/health`, and its migrations table (`<service_name>_migrations`, because all subsystems share one database).

Remaining foundation backlog:
- Merge `feature/42-backend-ci` (build, lint, test) and extend it with `format:check`, `test:cov` plus a coverage artifact, integration tests against a `postgres:16` service, and `npm audit --audit-level=high`. Expected merge conflicts: `package.json`, `app.module.ts`, `main.ts` (keep the foundation versions) and `config/database.config.ts` (delete it).
- Swagger/OpenAPI (`@nestjs/swagger`) when the first feature endpoint is added.
- `@CurrentUser()` decorator and roles guard reading gateway-forwarded user context, once §11.2 is decided.
- `messaging/` (RabbitMQ) and `realtime/` (WebSocket) module skeletons when the first event or live update is needed.

### Commands (run from `backend/`)
```bash
npm ci
cp .env.example .env            # PowerShell: if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm run start:dev               # then: curl http://localhost:3000/health
npm run lint                    # check only; npm run lint:fix applies fixes
npm run format:check            # check only; npm run format rewrites files
npm run build
npm test                        # unit tests (src/**/*.spec.ts)
npm run test:cov                # coverage -> backend/coverage, fails below 80%
npm run test:integration        # test/integration/*.integration-spec.ts, needs a real DB from .env
npm run migration:generate -- src/database/migrations/<Name>   # also: migration:create | run | revert | show
docker build -t hotel-website-backend .
```
Code style: Prettier (`singleQuote`, `trailingComma: all`), ESLint flat config with `typescript-eslint` recommendedTypeChecked. The TypeScript target is ES2023 with `module: nodenext`, and `strictNullChecks` is on.

---

## 3. Mandated technology and architecture (SRS §7.1, SDS ch.1)

- **Backend:** NestJS (required). **Frontend:** Next.js (required). **DB:** PostgreSQL (15/16) through TypeORM, with parameterised queries only.
- **Inter-service:** REST over HTTP inside the Docker network. Async events go through **RabbitMQ (AMQP 0-9-1)** with durable queues and dead-letter queues. Real-time updates use WSS (Socket.IO NestJS gateway).
- **All client traffic goes through the API Gateway** (Nginx). It terminates TLS on port 443 (Let's Encrypt/Certbot), validates JWTs, rate-limits per IP (**100 req/min**), caps payloads at **1 MB**, and routes by path prefix. The HW backend itself is reachable only on the internal Docker bridge network.
- Authentication and RBAC are centralised in the shared **`api-gateway` repo** (team-agreed; SDS calls it the Auth Service). Subsystems do not duplicate JWT validation (see §9 and [Open decisions](#open-decisions-and-document-conflicts)).
- **Deployment:** every service is a Docker container managed with Docker Compose on an Ubuntu 22.04 VPS (DigitalOcean Singapore; 4 vCPU/8 GB minimum). Images go to `ghcr.io`, tagged with the commit SHA. Keep each image under 500 MB.
- **External integrations used by HW:** Stripe (payments), SendGrid (email), and Google Maps Embed (About page).
- **Environments** (SDS Table 20):
  - **Development:** Docker Desktop, seeded ephemeral DB, Stripe test mode, SendGrid sandbox, console debug logs.
  - **Staging:** separate VPS, persistent DB with an anonymised snapshot, Stripe test mode, Let's Encrypt staging cert, JSON info logs.
  - **Production:** Stripe live, JSON warn/error logs plus remote syslog.
  - An image that passes staging is promoted to production **unchanged** under the same tag.

---

## 4. Functional requirements owned by HW (SRS §4.1)

Every ticket and test should trace to these IDs.

| ID | Requirement | Priority |
|---|---|---|
| HW-01 | Home page with hero banner, hotel description, highlights, and **active promotions fetched from MAD** | High |
| HW-02 | About Us page with history, facilities, policies, and an **embedded Google Maps** location | High |
| HW-15 | Services & Facilities page: swimming pool, karaoke room, WOK family restaurant, meeting rooms, mini function hall, spa, gym, honeymoon packages, scenic photo locations | High |
| HW-16 | FAQ section, plus a **contact form that emails enquiries to hotel management** | Medium |
| HW-17 | Fully responsive: mobile 320px+, tablet 768px, desktop 1280px+ | High |
| HW-03 | Rooms page listing all room types with high-resolution images, full amenities, price/night, and **real-time availability indicators** | High |
| HW-04 | Compare **up to three** room types side by side | Medium |
| HW-05 | Availability calendar per room type showing available and blocked dates | High |
| HW-09 | Validate real-time availability **before confirming** a booking; reject unavailable room types | High |
| HW-06 | Visitor self-registration (name, email, password), with the password stored as a **bcrypt hash** | High |
| HW-07 | Login with email and password, which returns a **JWT** | High |
| HW-13 | Logged-in guest dashboard listing upcoming and past bookings | High |
| HW-08 | Logged-in guest books a room: check-in/check-out dates, room type, number of guests, optional special requests | High |
| HW-10 | Apply a promo code at checkout; valid MAD-created codes reduce the total by a **percentage or fixed amount** | High |
| HW-11 | Stripe processes a **full payment or an advance deposit** | High |
| HW-12 | SendGrid confirmation email after successful payment: Booking Reference ID, room type, dates, total paid | High |
| HW-14 | Modify or cancel a booking **up to 24 hours before check-in**, following the cancellation policy, with an email confirming the change | High |

Related cross-subsystem requirements:
- **MD-05, MD-05b, MD-05c:** active promo codes are published to HW in real time. Deactivated codes disappear from HW in real time.
- **FD-13:** a room marked *Under Maintenance* in FDS is blocked from future bookings. HW availability must respect this.
- **SI-04:** the Google Maps Embed API uses a **domain-restricted key**, and no user data is sent to Google.

### Use cases and flows
- **UC-HW-01, View Hotel Information and Contact Hotel (actor: Visitor):** home, then select a section (Services, About, Promotions, FAQ, Contact, Location). A contact enquiry is validated and forwarded to management.
- **UC-HW-02, Book Room (actor: Registered Guest)**, following the SDS sequence diagram in §4.1 and flow HW-03:
  1. Browse room types and pick dates. The system validates the date range and real-time availability; if nothing is available it shows "no rooms".
  2. If the guest is not logged in, they register or log in and receive a JWT.
  3. The guest selects a room type, number of guests, and special requests, and can optionally apply a promo code (validated, total recalculated).
  4. The system calculates the total. The guest chooses **full payment or advance deposit** and is sent to Stripe Checkout/PaymentIntent.
  5. **The Stripe webhook confirms the booking.** The booking record gets status `CONFIRMED`, a SendGrid confirmation email is sent, and the reference and summary are shown.
  6. If payment fails, the failure is shown and the guest can retry.
- **UC-HW-03, Account and Self-Service** (SDS flows HW-01, HW-02, HW-04):
  - Registration: validate input, check that the email is not already registered, bcrypt hash, create the account, send a **welcome email via SendGrid**, redirect to login.
  - Login: valid credentials produce a JWT, which is stored, and the guest is redirected to *My Bookings*.
  - Modify or cancel: if check-in is more than 24h away, the guest can modify (change dates or room type, recalculate the price, re-apply the promo, update, send an email) or cancel (refund through Stripe if paid, set status `CANCELLED`, send an email). Otherwise show "Cannot modify/cancel within 24h".

### Business rules (SRS §6.1, §6.4)
1. Check-out must be later than check-in.
2. Guests may modify or cancel up to 24h before check-in.
3. **A booking is confirmed only after Stripe confirms payment.**
4. A room cannot be assigned to more than one active booking for the same date range. Availability is therefore a count of rooms of that type, minus overlapping active bookings, minus rooms Under Maintenance.
5. Guests may access only their own bookings (RBAC, role `GUEST`). This is the OWASP A01 check.

---

## 5. Data model relevant to HW (SRS ch.13, SDS ch.2 ER/class diagrams)

All PKs are UUIDs, except `Room.roomNumber`. Money is stored as an **INTEGER in LKR cents** and sent with the currency code `LKR`; never use floats. Timestamps are `TIMESTAMPTZ` in UTC and serialised as ISO 8601 (for example `2025-07-15T14:30:00Z`). Every table has `created_at` and `updated_at`. FK constraints are enforced in the DB.

**Guest** (owned by HW)
- `guestId` PK
- `fullName` VARCHAR(255) NOT NULL
- `email` VARCHAR(320) UNIQUE NOT NULL, the login identifier
- `passwordHash` VARCHAR(255) NOT NULL, bcrypt with cost ≥ 12
- `nicOrPassport` VARCHAR(50), nullable; FDS collects it at check-in
- `phone` VARCHAR(20), nullable
- `createdAt`

**Booking** (created by HW; also by FDS for walk-ins and Booking.lk imports)
- `bookingId` PK, used as the Booking Reference ID
- `guestId` FK → Guest
- `roomTypeId` FK → RoomType NOT NULL
- `roomNumber` FK → Room, nullable (FDS assigns it at check-in)
- `checkInDate`, `checkOutDate` DATE (checkIn < checkOut)
- `status` ENUM: `PENDING | CONFIRMED | CHECKED_IN | CHECKED_OUT | CANCELLED`
- `totalAmount` INTEGER > 0 (cents)
- `promoId` FK → PromotionCode, nullable
- `numberOfGuests`, `specialRequests` (required by HW-08; not listed in the SRS table, so add them)
- `source` ENUM: `WEBSITE | WALK_IN | BOOKING_LK`, default `WEBSITE`
- `createdAt`
- Per SDS 3NF, payment data moved out of Booking into **Payment**.

**Payment** (SDS transitive dependency #6)
- `paymentId` PK
- `bookingId` FK
- `amount` (cents)
- `paymentMethod`
- `paymentType` (full or advance deposit)
- `provider` (Stripe)
- `transactionReference` (Stripe PaymentIntent id); **never store card data**
- `receiptNumber`
- `status`
- `paidAt`
- Booking 1:N Payment, which covers deposit + balance and refunds.

**RoomType** (read by HW)
- `roomTypeId` PK
- `typeName`
- `description`
- `pricePerNight` (cents)
- `maxGuests`
- Also needed by HW-03: image URLs and an amenity list. The class diagram shows `imageUrls`; amenities need their own column or lookup table.

**Room** (read by HW for availability)
- `roomNumber` VARCHAR(10) PK
- `roomTypeId` FK
- `floor`
- `status`: `VACANT | OCCUPIED | REQUIRES_CLEANING | UNDER_MAINTENANCE`
- `lastClearedAt`
- `notes`

**PromotionCode** (owned by MAD; HW reads and validates)
- `promoId` PK
- `codeString` UNIQUE; alphanumeric, `-` and `_`, max 50 characters, stored uppercase
- `discountType` (percentage or fixed)
- `discountValue`
- `validFrom`, `validUntil`
- `maxRedemptions`
- `isActive`
- Applicable room types (MD-05)

**AuditLog:** append-only. Authentication events (login success and failure, password changes, token issuance) are kept 12 months. Payment events (confirmation, refunds, failures) are kept **7 years**.

**Retention (SRS §13.2):**
- Booking records and payment references: 7 years.
- Guest accounts: 3 years after the last stay.
- Structured system logs: 12 months.
- Right to erasure: anonymise the personal data (name → `REDACTED`, email → unique hash) and keep the financial records.

---

## 6. Security requirements (SDS ch.6, SRS §12.4.3, course §8 OWASP)

- **JWT:**
  - Signed with HS256 using a shared secret from env or secrets (SRS also allows RS256).
  - Claims: `iss`, `sub` (user UUID), `exp`, `iat`, `role` (`GUEST` for HW users).
  - Guest expiry is **24h**. There is no refresh token; the guest logs in again after expiry.
  - Sent as `Authorization: Bearer`.
  - Prefer an **HTTP-only, Secure, SameSite cookie** to localStorage. The SDS allows either, but the cookie mitigates XSS token theft.
- **Passwords:** bcrypt with cost factor **≥ 12**. Never log or return passwords or hashes.
- **Payments (PCI-DSS SAQ A):**
  - Card data is tokenised client-side by Stripe.js, and raw card data never reaches our servers.
  - The server creates the PaymentIntent. **Verify the webhook signature** (`payment_intent.succeeded` / `payment_intent.payment_failed`) before changing booking state.
  - The webhook handler must be **idempotent**, because Stripe retries.
  - Store only Stripe references.
- **Input validation** happens at several layers:
  - Client-side checks.
  - The gateway schema check.
  - NestJS DTOs with `class-validator` and the global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`). **Implemented** in `common/pipes/validation.pipe.ts`; failures return `400 VALIDATION_FAILED`.
  - DB constraints.

  Rules (SDS Table 14):
  - **Email:** RFC 5321, max 320 characters; trim and lowercase.
  - **Phone:** 10–15 digits, optional `+`.
  - **Guest name:** letters, spaces, hyphens, and apostrophes; max 255.
  - **Free text:** max 300 characters, HTML-escaped, script tags stripped.
  - **Money:** positive integer cents; reject decimals.
  - **Dates:** valid ISO 8601 UTC, check-in before check-out.
  - **Promo code:** see the PromotionCode rules above.
- **SQL injection:** use only TypeORM parameterised queries or the query builder with parameters. No string-concatenated SQL.
- **XSS:** rely on Next.js/JSX escaping, add a CSP header, and never use `dangerouslySetInnerHTML` with user input.
- **PII:**
  - Guest name, email, and phone are encrypted at rest (pgcrypto AES-256-GCM, key in env).
  - PII must never appear in logs or RabbitMQ payloads; use UUIDs instead.
  - Guests access only their own data.
- **Transport:** TLS 1.2+ externally (1.0 and 1.1 disabled). DB connections use TLS.
- **Errors:** never leak stack traces in production (OWASP A05). Use a global exception filter.
- **OWASP checklist (evidence needed in the final report):**
  - **A01:** ownership and role checks, tested to return 403.
  - **A02:** bcrypt ≥ 12, hashed tokens, TLS.
  - **A03:** parameterised queries.
  - **A05:** no default credentials, no stack traces.
  - **A06:** `npm audit --audit-level=high` in CI.
  - **A07:** **account lockout after N failed logins**.
  - **A08:** commit `package-lock.json` and use `npm ci`.
  - **A09:** log auth events without PII.
  - **A10:** allow-list any external URL.
- **Secrets:** never commit secrets. Keep `.env` for local work, update `.env.example` (placeholders only) whenever a new variable is added, and use GitHub Secrets in CI. Expected future variables:
  - `JWT_SECRET`, `JWT_ISSUER`, `JWT_EXPIRES_IN`
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `HOTEL_MANAGEMENT_EMAIL`
  - `PII_ENCRYPTION_KEY`
  - `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`
  - `RABBITMQ_URL`

---

## 7. Non-functional requirements that apply to HW (SRS ch.5)

- **Performance:**
  - NFR-01: p95 API response ≤ **500 ms** at 100 concurrent users.
  - NFR-14: supports **300 concurrent users**.
  - Show loading indicators for fetches longer than 300 ms.
- **Reliability:**
  - NFR-04: 99.5% monthly uptime.
  - NFR-06: a failure in another service must not break HW.
- **Security:**
  - NFR-10: HTTPS with TLS 1.2+.
  - NFR-12: JWT and RBAC on every authenticated endpoint.
  - NFR-13: no card data stored.
- **Maintainability:**
  - NFR-16: schema changes only through versioned TypeORM migrations.
  - NFR-17: structured **JSON logs**, retained 12 months.
  - NFR-18: every error is logged with timestamp, service name, and description.
- **Portability:** NFR-19: runs in Docker on Linux.
- **Messaging:** RabbitMQ events use the envelope `{ eventType, sourceService, timestamp (ISO 8601), correlationId (UUID v4), payload }`.
- **APIs:** REST with UTF-8 JSON, `Content-Type: application/json` on every response, documented with **Swagger/OpenAPI** (`@nestjs/swagger`) before or alongside implementation.

---

## 8. Frontend (Next.js) UI requirements (SRS §12.1, SDS §5)

- Mockups are in Figma: https://www.figma.com/design/oHP2rxAfJCZeAB2aodrH8I/Forever-city-Hotel-Management-system
- Pages:
  - Home
  - About Us (with the Maps embed)
  - Services & Facilities
  - Rooms (list, detail with availability calendar, compare up to 3)
  - FAQ and Contact
  - Register, Login
  - My Bookings (upcoming and past; modify and cancel)
  - Booking wizard
- **Booking wizard:** a multi-step flow with a visible progress indicator: *Room Selection → Guest Details → Payment → Confirmation*. It includes a **review step before final submission** (WCAG "Understandable").
- **Availability calendar colours:** available is **green**, fully booked is **red**, the selected range is **blue**. Colour is never the only signal, so add text or labels too.
- **Comparison table:** consistent attribute rows for up to three room types.
- **Cookie consent banner** on first visit.
- **Accessibility (WCAG 2.1 AA):**
  - Alt text on every image.
  - A visible `<label>` for every field.
  - Contrast ≥ 4.5:1 for text and 3:1 for large text and UI elements.
  - Reflow at 320px with no horizontal scroll.
  - Full keyboard operation, visible focus, logical focus order.
  - Touch targets ≥ 44×44px.
  - `lang="en"` on the root.
  - Inline field errors announced through ARIA.
  - Valid HTML.
- **Visual language:** a consistent palette and component library shared across subsystems. SRS §12.1.1 names Times New Roman or an equivalent serif. Use plain English in guest-facing copy.

---

## 9. Team-agreed backend structure (Forever City Hotel "Backend Folder Structure Guide")

Every subsystem in the team uses this structure. Follow it for all new backend code in this repo.

### Core rules
- **One backend serves web and mobile/PWA clients.** Both reach it through the API Gateway (`Web / PWA → API Gateway → microservices → PostgreSQL`, plus RabbitMQ and WebSocket).
- **Organise by business feature or domain, never by client type.** Do **not** create `src/web/`, `src/mobile/`, `src/web-api/` or `src/mobile-api/`. Any authorised client calls the same endpoint.
- **Authentication and authorisation are not duplicated in each subsystem.** The shared **`api-gateway` repository** (`src/auth, guards, proxy, routing, common, config, health`) validates JWTs centrally, applies RBAC at the shared boundary, and routes to the owning service. Business logic stays in the owning microservice (here, HW).
- **Keep data access out of controllers.** Controllers go to services, services go to repositories in `database/repositories/`.

### Repository layout
```
hotel-website/                 # <subsystem-repository>
├── frontend/                  # Next.js website (to be created)
└── backend/
    ├── src/
    │   ├── main.ts
    │   ├── app.module.ts
    │   ├── config/            # configuration.ts, env.validation.ts, constants.ts
    │   ├── database/          # database.module.ts, database.service.ts, repositories/<feature>.repository.ts
    │   ├── common/            # decorators/ dto/ enums/ exceptions/ filters/ guards/ interceptors/ interfaces/ pipes/ utils/
    │   ├── <feature>/         # dto/, interfaces/, <feature>.controller.ts, <feature>.service.ts, <feature>.module.ts, *.spec.ts
    │   ├── messaging/         # rabbitmq.module.ts, rabbitmq.service.ts, publishers/, consumers/
    │   ├── realtime/          # realtime.module.ts, *.gateway.ts, events/
    │   └── health/            # health.controller.ts, health.module.ts
    ├── test/
    │   ├── integration/       # Supertest + real test PostgreSQL
    │   └── e2e/
    ├── .env.example, .gitignore, package.json, package-lock.json
    ├── tsconfig.json, tsconfig.build.json, jest.config.ts
    └── README.md
```

| Folder | Responsibility |
|---|---|
| `config/` | Env configuration, env validation (fail fast on missing variables), constants such as `CANCELLATION_CUTOFF_HOURS` and `BCRYPT_COST` |
| `database/` | Connection layer (TypeORM) and repositories; all SQL and data access lives here |
| `common/` | Reusable technical building blocks: global exception filter (error body below), JSON logging interceptor, validation pipe, role/ownership guards, shared DTOs and enums |
| `<feature>/` | One module per business domain, with its controller, service, DTOs, interfaces, and co-located `*.spec.ts` unit tests |
| `messaging/` | RabbitMQ publishers and consumers (event envelope in §7) |
| `realtime/` | WebSocket gateways, if HW needs live updates (for example promotions or availability) |
| `health/` | Health and readiness endpoints for Docker, CI smoke tests and monitoring |
| `test/` | Integration and E2E tests that use real infrastructure |

### HW feature modules
The proposed modules are listed here; none of them are built yet.

```
backend/src/
├── config/  database/  common/
├── guests/          # guest registration (HW-06), profile, Guest entity + bcrypt hashing
├── room-types/      # room type catalogue, images, amenities, compare up to 3 (HW-03, HW-04)
├── availability/    # availability calendar + real-time check (HW-05, HW-09; respects FD-13 maintenance)
├── bookings/        # create / list mine / modify / cancel, 24h rule, ownership (HW-08, HW-13, HW-14)
├── payments/        # Stripe PaymentIntent, signed idempotent webhook (raw body), refunds, Payment entity (HW-11)
├── promotions/      # read and validate MAD-owned promo codes, apply discount (HW-01, HW-10)
├── notifications/   # SendGrid: welcome, confirmation, modification, cancellation emails (HW-12, HW-14)
├── contact/         # contact form sends enquiry to management (HW-16)
├── messaging/       # e.g. consume promotion published/deactivated events; publish booking-confirmed/cancelled
├── realtime/        # only if needed
└── health/          # GET /health
```

Put migrations under `database/migrations/`. Keep controllers thin and logic in services that depend on repository interfaces (SOLID and DIP), so unit tests can mock the repositories and the Stripe and SendGrid clients.

**Auth split:** the gateway's `auth/` module validates JWTs and enforces roles. HW trusts the user context the gateway forwards (for example the `sub` and `role` headers or claims) and still checks **ownership**, so a guest can only reach their own bookings. HW still owns guest-specific business data (the Guest record and registration). Who *issues* the guest token at login is an open decision (§11).

The foundation already follows this layout (§2, §13.2). The guide's folders not yet created are `common/decorators|dto|enums|exceptions|guards|interceptors`, `messaging/`, `realtime/`, `test/e2e/` and `frontend/`; add each one when the first code needs it (YAGNI), or as empty `.gitkeep` folders if the team wants the full shape visible in the template. Extras beyond the guide (migrations, Dockerfile, CHANGELOG, Jest configs, `.github/` templates) are course or SDS requirements; propose adding them to the team guide.

**Error body convention**, following the course example:
```json
{ "error": "ROOM_TYPE_UNAVAILABLE", "message": "Human readable" }
```
Use the correct HTTP status: 400 validation, 401 unauthenticated, 403 forbidden, 404, 409 conflict (for example, room no longer available).

**Illustrative endpoints** (to be agreed as API contracts; the gateway adds the HW path prefix). Paths use domain nouns, not client types:
- `POST /guests/register`; login is either `POST /auth/login` at the gateway or HW, per §11
- `GET /room-types`, `GET /room-types/:id`, `GET /room-types/compare?ids=`
- `GET /availability?roomTypeId=&from=&to=`
- `POST /promotions/validate`, `GET /promotions/active`
- `POST /bookings`, `GET /bookings/me`, `PATCH /bookings/:id`, `POST /bookings/:id/cancel`
- `POST /payments/intent`, `POST /payments/webhook`
- `POST /contact`, `GET /health`

Concurrency: wrap "check availability and create booking" in a DB transaction with an appropriate lock or constraint, so that two guests cannot book the last room (course example AC4 pattern).

---

## 10. Engineering process (course guideline — follow strictly, it is graded)

### Branches (§3.2)
- `main`: production. Protected, PR-only, and tagged with SemVer.
- `develop`: integration branch; all feature PRs target it. The repo also has `pre-develop`; confirm which one the team uses as the integration branch.
- `feature/<issue-id>-<slug>` (for example `feature/42-user-auth`), `fix/<issue-id>-<slug>`, `hotfix/<slug>` (branched from `main`), `release/<version>`.
- Branches are short-lived. Open a PR within **5 working days** or split the issue.

### Versions (§3.3)
- SemVer `vMAJOR.MINOR.PATCH`.
- Sprint 5 ships **v0.1.0**, Sprint 6 **v0.2.0**, Sprint 7 **v0.3.0**, Sprint 8 **v1.0.0**.

### Commits (§3.4)
- Conventional Commits: `type(scope): summary`.
- Types: `feat` (MINOR), `fix` (PATCH), `test`, `ci`, `build`, `perf`, `refactor`, `docs`, `chore`, `style`, `revert`.
- The body explains the why and cites SRS/SDS/ADR where relevant.
- The footer has `Closes #NN` or `Refs #NN` and `Refs ADR-NN`.

Example:
```
feat(bookings): reject bookings for unavailable room types

Validates real-time availability inside the booking transaction as
required by HW-09 and business rule 6.1.4.

Closes #57
```

### Issues (§4.3)
- Title: `[DDP-#NN] type(scope): summary`.
- Labels: an epic (`epic:api`, `epic:auth`, `epic:data-layer`, `epic:ui-frontend`, `epic:integration`, `epic:testing`, `epic:ci-cd`, `epic:security`, `epic:performance`, `epic:documentation`, `epic:dev-setup`, `epic:core-features`), a priority, and a type.
- Project board field **Phase = Development**; flow Backlog → To Do → In Progress → In Review → Done.
- Body sections:
  - User Story
  - Background (SRS FR-ID, SDS section, ADR)
  - BDD Acceptance Criteria (happy path, error with HTTP status and error body, edge case)
  - Technical Notes
  - Test Requirements
  - DoD
  - Estimate
  - Dependencies

### Pull requests and review (§5.3)
- Every PR targets `develop` with the description fully completed.
- **≥ 1 approving review**, and all `[blocker]` comments resolved before merge.
- Comment prefixes: `[blocker]`, `[suggestion]`, `[question]`, `[nit]`. The **reviewer**, not the author, resolves comments.
- Review dimensions: correctness, readability, architecture vs SDS, test quality, security, performance (N+1 queries, blocking calls), error handling.

### Coding principles (§5.1)
- SOLID, DRY, and **YAGNI**: build only what the current sprint's acceptance criteria need.
- Meaningful names, small functions, no magic numbers. Put constants such as `CANCELLATION_CUTOFF_HOURS = 24`, `BCRYPT_COST = 12`, and `MAX_COMPARE_ROOM_TYPES = 3` in config.
- Style guide: Airbnb/ESLint + Prettier for TS. The linter config lives at the repo root, and a coding standards doc goes in the `documents` repo under `documents/standards/`.

### Testing (§6)
- Code without tests is unfinished.
- **Unit tests:**
  - Arrange/Act/Assert, with names like `it('should … given …')`.
  - **≥ 80% line and branch coverage on new code.**
  - **≥ 90% branch coverage on critical business logic**: availability, pricing and promo calculation, 24h modification rule, payment/webhook state transitions.
- **Integration tests:** at least one for **every API endpoint**, using Supertest against a real test PostgreSQL seeded and cleaned between tests. Cover the happy path, the error path, and authorisation (403 for another guest's booking).
- **E2E:** all happy paths plus the top 3 critical flows (registration and login, booking with payment, modify or cancel).
- **Stripe and SendGrid:** mock them in unit tests. Use Stripe test mode and webhook test payloads in integration tests.
- **Test register:** every functional test case is recorded as `TC-<FR>-<nn>`, for example `TC-HW-09-01`. Fields: name, requirement, file, type, priority, preconditions, input, expected, actual, status.

### CI/CD (§7, SDS §7.5) — GitHub Actions, live by end of Sprint 5 (week 4)

| Stage | Trigger | Actions |
|---|---|---|
| Lint and format | every push to any branch | ESLint without `--fix`, plus `prettier --check`; fail on errors |
| Build | every push to any branch | `nest build` / `next build`; fail on error |
| Unit tests + coverage | every push to any branch | Jest with coverage; upload the `coverage/` artifact; enforce the 80% threshold |
| Integration tests | push or PR to `develop` | `postgres:16` service container |
| Security scan | push to `develop` / `main` | `npm audit --audit-level=high` (plus Dependabot) |
| Deploy to staging | merge to `develop` | Docker image → ghcr.io → staging VPS (`docker compose pull && up -d`), then health and smoke checks |
| Deploy to production | merge to `main` | manual approval; tagged release |

Rollback means redeploying the previous image tag, within 2 minutes.

### Definition of Done (Appendix A)
- Acceptance criteria verified.
- Linter passes.
- Unit tests for new logic.
- Integration tests for new endpoints.
- Coverage ≥ 80%.
- No hardcoded secrets.
- PR to `develop` with 1 review and blockers resolved.
- CI green.
- Deployed to staging and smoke-tested.
- Swagger/Postman updated.
- `CHANGELOG.md` `[Unreleased]` updated.
- Issue linked (`Closes #XX`) and moved to Done.

### README requirements (§9.3)
The README must contain:
- Project description and a link to the broader project.
- Prerequisites and environment variables.
- Step-by-step install and run instructions that work on a fresh machine.
- A link to the deployed staging app.
- A CI status badge and a coverage badge.

### Timeline (16 weeks)

| Sprint | Weeks | Focus | Release |
|---|---|---|---|
| Sprint 5 | 1–4 | Foundation: data layer, auth, domain models, CI | v0.1.0 |
| Sprint 6 | 5–8 | Core features, unit-tested | v0.2.0 |
| Sprint 7 | 9–12 | Integration, API contracts, UI completion | v0.3.0 |
| Sprint 8 | 13–16 | Testing and hardening (weeks 13–14), staging sign-off (week 15), live panel demo **on staging, not localhost** (week 16) | v1.0.0 |

Retrospectives go in `documents/retrospectives/`.

---

## 11. Open decisions and document conflicts

Flag these to the team and supervisor. Do not resolve them unilaterally in code.

1. **Database isolation.** The SDS (§1.1, §1.5.2) specifies **one shared PostgreSQL** with **subsystem table prefixes** (for example `hw_`), where each service writes only its own tables and cross-service reads are read-only. SRS SI-07 says **database-per-service schemas with no cross-service joins**. The SDS is newer; follow it unless an ADR says otherwise. Decide the prefix and schema convention and document it.
2. **Who issues guest tokens.** The team agreed that JWT validation and RBAC live in the shared `api-gateway` repo, so HW must not add its own JWT guard. Still to agree: does guest **login** (credential check against the Guest table, lockout, token issuance) run in the gateway's `auth/` module or in an HW endpoint called by the gateway? Also agree how the gateway forwards user context (headers) to HW. Record the answer in an ADR.
3. **Promotion data flow.** Should HW read MAD's promotion table directly (shared DB) or consume a RabbitMQ "promotion published/deactivated" event (SDS MAD-08 says "publish to Hotel Website via event bus")? It is also undecided which service increments redemption counts against `maxRedemptions`.
4. **Nullable `Booking.guestId`.** The SRS says NOT NULL but notes it "may be null for walk-in". HW bookings always have a guest; confirm the rule with the FDS owner.
5. **Encrypting email at rest vs a UNIQUE login lookup.** Column encryption breaks equality lookups. Use a deterministic hash or blind-index column for lookup and uniqueness, alongside the encrypted value.
6. **Advance deposit amount** and the **cancellation and refund policy** (full or partial refund) are not defined. Get them from the client before implementing HW-11 and HW-14.
7. **Missing Booking attributes:** `numberOfGuests`, `specialRequests`, `promoId`. **Missing RoomType attributes:** amenities, images. Promotion ↔ applicable room types needs a join table.
8. **Integration branch:** `develop` (per the course) vs `pre-develop` (present in the repo). The team currently merges into `pre-develop`.
9. **Neon instead of Dockerised PostgreSQL for development** (§13.3). Write an ADR in the `documents` repo, and agree whether the other subsystems use the same Neon project and a table-prefix convention.
10. **Default ports.** The Next.js frontend defaults to 3000, the same as this backend. Agree a port per service (for example backend 4000) before adding `frontend/`, and tell whoever owns the API Gateway and Docker Compose configuration.
11. **Whether to commit `CLAUDE.md`.** It holds no secrets and helps anyone using Claude Code; it is a team choice.

---

## 12. Working rules for Claude in this repo

- Trace every change to an SRS ID (HW-xx, NFR-xx, BR 6.x) and mention it in the commit or PR.
- Don't commit or push unless asked. When committing, use Conventional Commits and branch per the naming rules; never commit to `main` or `develop` directly.
- Never write real secrets. Update `.env.example` with placeholders whenever a new environment variable is needed.
- Every new feature ships with unit tests, and every new endpoint with integration tests, meeting the coverage targets.
- Don't enable `synchronize` on anything except a disposable local DB. New schema work goes through migrations.
- Keep PII and card data out of logs, events, fixtures, and test snapshots.
- Follow the team-agreed backend structure (§9): feature modules, data access only in `database/repositories/`, no client-type folders, and no duplicated gateway auth.
- Stay within HW scope. Changes that touch other subsystems' tables, events, or contracts must be raised as API-contract or ADR discussions.
- Never disable TLS certificate verification (`rejectUnauthorized: false`) to work around a network problem (§13.4).
- Never write real hosts, passwords, keys or connection strings into tracked files, including this one, the README, tests and commit messages. If a secret is pasted into a chat or a tracked file, treat it as leaked and tell the user to rotate it.

---

## 13. Work log and decisions so far

A record of what has been done in this repository and why, so the next session (or teammate) can continue without repeating the investigation. Dates are 2026-09-26 to 2026-09-27. **Nothing below has been committed yet** unless stated; check `git status`.

### 13.1 Starting point
- Branch `pre-develop` at `174bc8c` (merge of PR #10, `feature/44-backend-config`).
- `backend/` was the NestJS starter: a `Hello World` controller (not registered in `AppModule`), `config/database.config.ts`, TypeORM with `synchronize: true` and `logging: true`, and an e2e test that could not pass. There was no health endpoint, no CI in this branch, and no `CHANGELOG.md`.

### 13.2 Backend foundation built (team-agreed structure)
Implemented in `backend/`, following §9:

| Area | Files | Behaviour and reason |
|---|---|---|
| Configuration | `config/constants.ts`, `env.validation.ts`, `configuration.ts` | Validates every variable at startup and lists all problems at once. Messages name the variable only, never its value, so passwords cannot reach logs. Rejects `DB_SYNCHRONIZE=true` when `NODE_ENV=production` (NFR-16). Typed `app` and `database` sections, read with `ConfigService.getOrThrow`. |
| Database | `database/typeorm-options.ts`, `database.module.ts`, `database.service.ts` | One options builder shared by the app and the migrations CLI, so they always connect the same way. `DB_SSL=true` enables TLS with `rejectUnauthorized: true`. `connectTimeoutMS` is 10 s, so a blocked network fails visibly instead of hanging. `autoLoadEntities` (entities are registered with `forFeature` per feature module). `DatabaseService.isHealthy()` runs `SELECT 1` and logs only the error type. |
| Migrations | `database/data-source.ts`, `database/migrations/`, `npm run migration:*` | `data-source.ts` is used only by the TypeORM CLI. It loads `backend/.env` with `process.loadEnvFile` if present, which never overrides real environment variables (CI and Docker). Each service records migrations in its own table, `<service_name>_migrations` (for example `hotel_website_migrations`), because all subsystems share one database (SDS 1.5.2). |
| Errors | `common/filters/all-exceptions.filter.ts`, `common/interfaces/error-response.interface.ts` | Every error becomes `{ "error": "CODE", "message": "..." }`. Custom codes come from `new XException({ error: 'CODE', message })`, otherwise from the HTTP status (`NOT_FOUND`). Unexpected errors return a generic 500 and are logged with their stack (OWASP A05). Only HTTP contexts get a response; other contexts (WebSocket, RabbitMQ) are logged and must use their own transport filter. |
| Validation | `common/pipes/validation.pipe.ts` (registered as `APP_PIPE`) | `whitelist`, `forbidNonWhitelisted`, `transform`. Nested errors are prefixed with their path. Failures return `400 VALIDATION_FAILED`. Added `class-validator` and `class-transformer`. |
| Logging | `common/utils/app-logger.ts`, `main.ts` | Extends Nest's `ConsoleLogger`. `LOG_FORMAT=json` prints one JSON object per line with `service`, `level`, `timestamp` and `context` (NFR-17, NFR-18). `main.ts` starts with a logger built from the process environment, so database retry messages print immediately, then switches to the validated configuration. |
| Health | `health/health.controller.ts`, `health.module.ts` | `GET /health` returns `200 { status, service, database }` or `503 DATABASE_UNAVAILABLE`. Used by the Docker `HEALTHCHECK` and future CI/staging smoke tests. |
| Service identity | `SERVICE_NAME` env var | Default `hotel-website`, lowercase kebab-case. Used in logs, `/health`, and the migrations table, so other subsystems reuse the template by editing `.env` only. |
| Docker | `backend/Dockerfile`, `backend/.dockerignore` | Multi-stage Node 22 Alpine. Production dependencies only, runs as the `node` user, `HEALTHCHECK` on `/health`, never contains `.env`. Migrations in a container: `npm run migration:run:prod`. |
| Tests | `*.spec.ts` next to the code, `jest.config.ts`, `test/integration/`, `test/jest-integration.json`, `test/jest-e2e.json` | Arrange-Act-Assert with `should … given …` names. Coverage threshold 80% (global). `data-source.ts`, migrations, `main.ts` and interfaces are excluded from coverage. |
| Scripts | `package.json` | `lint` (check only), `lint:fix`, `format`, `format:check`, `test`, `test:cov`, `test:integration`, `test:e2e` (`--passWithNoTests`), `typeorm`, `migration:create|generate|run|revert|show`, `migration:run:prod`. `engines.node >= 20.12` (needed for `process.loadEnvFile`). |
| Build fix | `tsconfig.build.json` | Excludes `jest.config.ts`; otherwise `dist/` nests under `dist/src/` and `start:prod` breaks. |
| Removed | starter controller, service and specs, `config/database.config.ts`, `test/app.e2e-spec.ts` | Replaced by the foundation. |
| Docs | `backend/README.md`, `backend/CHANGELOG.md`, `backend/.env.example`, this file | README covers setup, Neon, every variable, validation, migrations, Docker, troubleshooting (including office networks), and reusing the foundation as a template. |
| GitHub templates | `.github/pull_request_template.md`, `.github/ISSUE_TEMPLATE/development-issue.md`, `bug-report.md` | Course formats: PR Definition of Done checklist, review prefixes, `[DDP-#NN]` issue with BDD acceptance criteria. |

### 13.3 Development database: Neon
- Neon project **`forever-hotel`**, free plan, **AWS Asia Pacific (Singapore)**, PostgreSQL **16**.
- Branches: **`production`** (default; keep for staging and the demo, never for day-to-day work) and **`dev`** (child of production, auto-delete *Never*, created with "Branch data and schema").
- Database `forever`, role `forever_owner`. The real host and password live only in each developer's `backend/.env`. Use the **direct** connection (Connection pooling **off**); the pooled `-pooler` host (PgBouncer) is meant for serverless and can break migrations and session features. Set `DB_SSL=true`.
- `DB_SYNCHRONIZE=true` is acceptable only on a personal or disposable branch. On any shared branch keep it `false` and use migrations, because two developers with different entity versions would overwrite each other's tables.
- **Team sharing plan (agreed direction, not yet done):** invite teammates to the Neon project, give each person a branch `dev-<name>` (ideally with their own role), keep `dev` as the shared branch with migrations only, and store CI values in GitHub Secrets. Watch the free-plan storage and branch limits.
- **Credentials were exposed during setup.** The `forever_owner` passwords for `production` and `dev`, and a Neon object-storage access key, were pasted into the chat, and the dev password was briefly written into `.env.example` (never committed or staged; placeholders restored). **Action required:** confirm the passwords were reset on both branches, the object-storage key (`nak_live_2f3b…`) was revoked, and `backend/.env` holds the new dev password.
- Object storage, Better Auth, Functions, AI Gateway and the Neon "onboard your agent" CLI prompt (`neon skills`, `neon mcp`, `neon link --branch production`, `neon deploy`) were deliberately **not** used. Auth belongs to the API Gateway, and the CLI prompt would link the production branch and add unagreed files.

### 13.4 Network finding: office network blocks PostgreSQL
- On the office (Brandix) network, `/health` was unreachable because the app never finished starting: TypeORM kept retrying the database connection.
- Diagnosis: DNS resolves and TCP ports 5432 and 443 open, but the PostgreSQL `SSLRequest` on 5432 gets **no reply** (traffic silently dropped), and HTTPS on 443 presents a certificate issued by **"Brandix"** (TLS interception). The `.env` values were correct.
- Workarounds: use another network (home Wi-Fi or a mobile hotspot), ask IT to allow `*.neon.tech:5432`, or run a local PostgreSQL (Docker Desktop is installed but was not running). **Do not** disable certificate verification. Teammates on the same network will hit the same issue.
- Resulting code changes: the 10 s connect timeout and immediate startup logging (§13.2).

### 13.5 Verification status
- **Passing locally:** `npm run lint`, `npm run format:check`, `npm run build`, and 39 unit tests in 8 suites, at 88% statements, 90% branches, 96% functions, 90% lines.
- **Checked by hand:** startup fails fast with missing variables and prints no values; an unreachable database logs retry messages and exits with code 1; `migration:create` generates a file; `migration:show` loads the data source; the app starts from `dist/` with **production dependencies only** (about 111 MB of `node_modules`, so the image should be about 260 MB, under the SDS 500 MB limit), printing JSON logs; the migration CLI works from the production layout.
- **Not yet verified:** `npm run test:integration` and a real `migration:run` against a database (blocked by the office network), and `docker build` (Docker daemon not running).
- A secret scan of every file Git would push found no real passwords, hosts or keys. `.env`, `node_modules/`, `dist/` and `coverage/` are ignored by `backend/.gitignore` and the root `.gitignore`; `.env.example` is tracked with placeholders.

### 13.6 Git and branch status
- Work is uncommitted on `pre-develop`. Planned delivery: create issue `[DDP-#NN] chore(backend): set up shared backend foundation and team template` (labels `epic:dev-setup`, priority, Sprint 5, Phase = Development), branch **`feature/NN-backend-foundation-template`** from an updated `pre-develop`, commit (`feat(backend): add shared backend foundation and team template`, footer `Closes #NN`, `Refs #42`, or four smaller commits: `refactor`, `feat`, `build`, `docs`), then a PR to `pre-develop` using the new template.
- **`origin/feature/42-backend-ci`** (not merged) adds `.github/workflows/backend-ci.yml`: Node 22, `npm ci`, `npm run build`, `npm run lint`, `npm test -- --runInBand`, on every push and on PRs to `develop`/`pre-develop`. It is compatible with the foundation. Merge it first. Expected conflicts: `backend/package.json`, `src/app.module.ts`, `src/main.ts` (keep the foundation versions) and `src/config/database.config.ts` (delete it). That branch also adds `.vscode/extensions.json` recommending `openai.chatgpt`; remove it as a personal preference. Later CI additions: `format:check`, `test:cov` plus a coverage artifact, an integration job with a `postgres:16` service (no Neon secrets needed), and `npm audit --audit-level=high`.
- An empty, accidental **`package-lock.json` in the repo root** (created by running npm from the wrong folder) should be deleted and not committed.

### 13.7 Using this foundation as the team template
- Shared by every subsystem: `config/`, `database/`, `common/`, `health/`, `main.ts`, `app.module.ts`, the test setup, `Dockerfile`, `.dockerignore`, lint and format config, `tsconfig*`, `.env.example`, and `.github/` templates. Not shared: feature folders, `.env`, `CHANGELOG.md` entries.
- Per subsystem, change only `SERVICE_NAME` in `.env.example`, the default `PORT`, `name`/`description` in `package.json`, and the README introduction.
- Suggested distribution: after review and merge, publish a `forever-hotel/backend-template` GitHub template repository ("Use this template"). A shared npm package is unnecessary for this project.
