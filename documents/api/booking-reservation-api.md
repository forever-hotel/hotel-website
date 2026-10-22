# Checkout API — Issue 22 / #171

## Current design

This replaces the earlier two-table proposal. Existing `bookings` stores checkout
holds, frozen prices and retry identity using five added nullable columns:
`hold_expires_at`, `checkout_key`, `checkout_request_hash`, `price_snapshot`,
`currency`. Existing `payments` is unchanged. The app never applies schema changes.

Quotes are signed price previews, not database rows or holds. The backend uses
a purpose-specific signing key derived from the existing JWT secret. A preview
belongs to the authenticated guest, is tamper-protected and lasts ten minutes.
It is signed, not encrypted; do not place contact details or payment secrets in it.
Rotating JWT_SECRET invalidates outstanding previews, not stored booking prices.

Starting payment creates a PENDING checkout with a twenty-minute hold, the signed
price breakdown and authoritative total. Changing catalogue rates or tax settings
later does not change that price. An expired checkout requires a fresh preview.
The unique guest/checkout key stays with the booking; the previous 24-hour
idempotency-table retention policy no longer applies. Keys are not recycled.

A PENDING checkout is not a confirmed stay. This API never marks bookings
CONFIRMED or writes a completed payment. GitHub #178 now implements verified
Stripe test payment separately. `/hw/payments/checkout` creates/reuses this hold
and extends it once to the approved 35-minute provider deadline; late payment on
an expired hold enters refund recovery instead of confirmation. See
[Stripe checkout](stripe-checkout.md).

## Requests

Both POST endpoints require the existing guest bearer JWT. Successful responses
are no-store. Unknown fields are rejected. The gateway removes `/hw`.

`POST /hw/booking-quotes`:

```json
{
  "roomTypeId": "11111111-1111-4111-8111-111111111111",
  "checkInDate": "2099-12-10",
  "checkOutDate": "2099-12-12",
  "numberOfGuests": 2
}
```

Returns 201 with `quoteId`, **`quoteToken`**, dates/guest context, currency,
nightly rate, nights, room/charge line items, subtotal, additional charges,
total, pricing policy version and preview expiry. Nothing is inserted.

When the guest starts payment, call `POST /hw/bookings`, with
`Idempotency-Key: checkout-attempt-001`:

```json
{
  "quoteToken": "COPY_THE_COMPLETE_TOKEN_FROM_THE_QUOTE_RESPONSE",
  "specialRequests": "Quiet room if possible."
}
```

**Breaking change:** passing only `quoteId` is no longer accepted. The token
carries the authenticated price preview without requiring a quote table.
Responses include bookingId, quoteId, PENDING status, dates/guests, original
price snapshot, total, currency and holdExpiresAt. Pending responses show zero
paid amount; replays of a subsequently confirmed booking report its current
status without inventing payment figures.

Retry the same token/request/key to receive the same booking. Changed request
content with the same key returns 409 IDEMPOTENCY_CONFLICT. The same preview
cannot start a second checkout with another key. Exact retries remain valid
while a hold is active even if the original preview has expired. An expired or
cancelled hold returns 409 HOLD_EXPIRED rather than creating another booking.

Keys are 8–128 ASCII letters/digits/hyphens/underscores; requests are plain text,
maximum 300 characters. Prices, guest IDs, cards, quantities, children, promotions
and meal plans cannot be supplied as unsupported fields in this one-room flow.
Errors include 400 validation/capacity, 401 auth, 404 invalid/foreign preview or
unknown room type, 409 sold-out/expired/used preview or conflicting retry, and
503 pricing/signing/storage unavailable. Catalogue price changes do not produce
PRICE_CHANGED for an active signed preview.

## Storage and rollout

Infra must review [the replacement SQL](booking-storage-proposal.sql) before
applying it through the approved workflow. It only extends `bookings`; no new
quote/idempotency tables are needed. It includes a unique guest/checkout key,
a unique guest/preview identity index and an expiry index. Existing rows have
NULL metadata and remain valid. Apply the entire proposal transactionally.

The SQL has NOT been applied by the assistant. Creating a checkout requires
these columns; missing columns produce BOOKING_UNAVAILABLE. Browsing and preview
availability use JSON field lookup so the old schema can still be read without
assuming those columns already exist. Old Front Desk PENDING rows with NULL
checkout metadata never expire automatically.

If an older two-table deployment has live holds, Infra must plan how those holds
will be migrated/finished before switching versions. No old tables or rows are
automatically removed or ignored as an implicit migration strategy.

`BOOKING_PRICING_POLICY` remains required for new previews. Example for development
only when intentionally testing final catalogue prices without added charges:

```dotenv
BOOKING_PRICING_POLICY='{"version":"dev-test-v1","rateBasis":"INCLUSIVE","charges":[]}'
```

This is not approved hotel tax policy. Applicable hotel taxes and whether rates
are inclusive must be confirmed. Existing exclusive charge rules use explicit
basis-point rates/bases, LKR cents and half-up line rounding. No environment files
were changed. Signing reuses the existing backend JWT configuration.

## Inventory locking and payment ownership

Checkout creation uses READ COMMITTED, a guest/key advisory lock, a guest/preview
advisory lock and the shared room-type row lock. It rechecks capacity/inventory,
then inserts one PENDING booking with the frozen snapshot in that transaction.
Unique database indexes are the additional duplicate-write protection.

Front Desk and maintenance writers must use the same inventory protocol or an
equivalent database-enforced authority. A database lock lasts only for the short
transaction; the saved hold protects inventory while the guest pays.
Availability excludes only expired website PENDING checkouts with checkout keys
and a recorded hold deadline. Later checkout creation cancels those expired rows
under the room-type lock. Paid/confirmed and legacy pending bookings stay blocking.
The payment implementation must release failed holds and coordinate confirmation
under the same inventory lock; no raw card collection is added here.

## Verification

```powershell
cd backend
npm.cmd run build
npm.cmd run lint
npx.cmd jest --runInBand --coverage
npx.cmd jest --config test/jest-integration.json --runInBand --testPathPatterns=booking-reservation
```

The PostgreSQL persistence tests apply proposed fields only to temporary copies.
The two-connection race suite is enabled by BOOKING_RACE_TEST=true only in the
existing localhost disposable PostgreSQL CI job. It uses its own isolated schema.
Never enable that flag against the shared Neon environment.

Unit/HTTP checks cover frozen prices after catalogue/policy changes, signed-token
ownership/tampering, no quote inserts, checkout replay, duplicate preview usage,
expired holds, capacity and unsupported inputs. Verification passed: 258 unit
tests across 36 suites, three checkout persistence tests, 12 booking/payment
mapping tests, build and lint. Unit line coverage is 91.07%. Database integration
checks used temporary table copies; the live database/schema remains unchanged.
The separate multi-connection race suite still requires the disposable CI DB
and was not run locally.
