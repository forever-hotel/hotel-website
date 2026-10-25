# Booking and cross-service integration contracts (DDP-#30)

This adds HTTP-level producer/consumer checks alongside the existing SQL and
browser suites. It does not replace a staging test or the DDP-#31 browser journey.

## What runs

`backend/test/integration/http-consumer-contracts.integration-spec.ts` starts
the real Nest application with its controllers, validation pipe, exception
filter, guest authentication, booking/payment/management services and repositories.
ORM repositories and raw SQL share a dedicated connection with temporary copies
of all ten tables used by the scenarios. Every test rolls back its data. Schema
synchronization must be disabled; live tables are never seeded by these tests.

The HTTP application mounts `/hw` to exercise browser-facing request paths. This
is not an actual gateway deployment. A separate test in
`api-gateway/test/gateway.test.ts` uses the shipped routing configuration and
fixture upstream servers to check the real gateway rewrite and forwarded headers.

PayHere checkout fields and callback signatures use the real implementation with
synthetic credentials. Retrieval results and Brevo responses are mocked. An
unexpected external fetch fails the test; no real payment, email or refund is
performed. The mocked contact destination represents the manager email boundary;
promotion data comes from temporary Manager-owned table copies, not a running
Manager Dashboard service.

| Contract                                      | Evidence                                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Rooms, images, currency and minor-unit prices | Real HTTP catalogue response parsed by the actual frontend catalogue consumer                                       |
| Availability/calendar and occupancy           | Real SQL-backed HTTP results; two-day calendar and capacity rejection                                               |
| Promotion marketing metadata                  | Active room-scoped feed parsed by the actual Offers consumer                                                        |
| Guest registration/login                      | Real hashing, persisted temporary guest rows, signed JWTs and protected routes                                      |
| Quote and frozen line items                   | HTTP quote parsed by the actual booking consumer; submitted prices/unsupported fields rejected                      |
| Pending → confirmed payment                   | Real checkout, signed callback verification and persisted settlement with mocked Retrieval corroboration            |
| Confirmation email                            | One sandbox send across repeated callbacks; immutable booking reference in receipt                                  |
| Profile and confirmation ownership            | Guest-scoped reads, other-guest 404, invalid JWT 401 and an empty other-guest list                                  |
| Change/cancel consistency                     | Signed change quote, saved modification, cancellation replay, pending refund and matching payment/Profile reads     |
| Failure contracts                             | Bad callback signature, uncorroborated callback, delayed Retrieval and failed enquiry delivery cannot claim success |
| Gateway boundary                              | Shipped `/hw` rewrite preserves queries, bearer identity, idempotency keys, and JSON request bodies                 |

The main HTTP scenario sends its actual responses in memory to
`frontend/tests/contracts/consume-backend.mjs`, which imports the same TypeScript
parsers used by the site. It first checks valid responses, then deliberately
removes or changes 16 contract fields and verifies each modified payload fails.
This detects producer/consumer drift rather than validating duplicate fixture
schemas. No JWT is included in the consumer payload or written to an artifact.

## Commands

From `hotel-website/backend`, with the normal database configuration and
`DB_SYNCHRONIZE=false`:

```powershell
npm run test:contracts
npm run lint
npm run format:check
npm run build
```

Node 22.14 or later in the Node 22 series is needed for the frontend consumer's
TypeScript stripping. The consumer reads checked-in frontend source; a running
frontend, frontend build, real PayHere account and real Brevo key are unnecessary.
The environment must permit local test HTTP servers and a Node subprocess.

The new suite is also discovered automatically by `npm run test:integration`.
Backend CI loads the checked-in infra schema into disposable PostgreSQL and
uploads `backend-integration-results` as a JSON test-report artifact, even after
a failing run. That report is generated output and ignored by Git.

For the related database regressions:

```powershell
node node_modules/jest/bin/jest.js --config test/jest-integration.json --runInBand --runTestsByPath test/integration/http-consumer-contracts.integration-spec.ts test/integration/booking-management.integration-spec.ts test/integration/guest-bookings.integration-spec.ts test/integration/booking-reservation.integration-spec.ts
```

In the separate `api-gateway` checkout:

```powershell
npm run build:test
node --test --test-name-pattern="shipped HW routes preserve booking contract" .test-build/test/gateway.test.js
```

Existing `booking-race.integration-spec.ts` supplies real concurrent last-room
protection checks in the explicitly enabled disposable localhost CI database.
Do not enable `BOOKING_RACE_TEST` against a shared database. The temporary-table
HTTP harness is deliberately sequential and does not claim concurrency evidence.

## Named gaps and verification limits

- Promo marketing is implemented; promo application to a quote is not. Tests
  reject `promoCode` instead of silently claiming a discount was applied.
- Multiple-room quantity, child-count pricing and add-ons are unsupported quote
  fields and explicitly rejected. No screenshot fixture invents their behavior.
- Refund processing and price differences remain staff-managed. Tests check
  pending refund state without claiming provider money movement.
- Stripe is legacy settlement coverage in the existing Stripe suite; new
  checkout coverage uses PayHere.
- Actual manager-service availability, live callback delivery, external mail
  delivery, gateway/provider production timeouts, image download optimization
  and 300-user load need their integration/staging/performance environments.
- Local broader gateway checks currently report an existing ambiguous-path
  `404` versus `400` assertion failure and an unused `require` binding in
  `eslint.config.mjs`. The new gateway contract test, targeted lint, formatting
  and TypeScript check pass; this issue does not conceal those broader failures.

Full CI success and reviewer approval remain merge requirements. A local focused
run does not mark the entire project board issue or release checks complete.
