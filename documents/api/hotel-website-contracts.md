# Hotel website API contracts

Status: **Draft for team review — not approved or implemented.**

Planning task: DDP-#06 in [issue.md](../../issue.md). Its actual GitHub issue number
has not been assigned here. Prepared on 2026-09-29.

## Scope and evidence

This document proposes browser-facing contracts for rooms, availability, guest
authentication, bookings, promotions and payments. All proposed browser routes
pass through the shared API Gateway. Internal service paths and credentials are
not browser contracts.

Source material: [project guide](../../codex.md), [architecture notes](../../CLAUDE.md),
[frontend standard](../../frontend/FRONTEND_STRUCTURE.md), and the DDP-#06 backlog.
Traceability: draft SRS HW-01, HW-03, HW-05–HW-14 and CI-01; SDS §§1.1, 1.4.1,
1.5.2 and 4.1, as summarized in those files. The original SRS was not supplied;
these references need verification against the approved documents. SDS flow
labels must not be confused with SRS requirement identifiers.

The current backend registers only `GET /health`. Its
[error interface](../../backend/src/common/interfaces/error-response.interface.ts),
[exception filter](../../backend/src/common/filters/all-exceptions.filter.ts) and
[validation pipe](../../backend/src/common/pipes/validation.pipe.ts) already define
the error format below. Business routes, DTOs, gateway mappings and sessions in
this document are proposals. This change adds documentation, not endpoints.

## Ownership and approval

These are proposed responsible teams, not recorded assignments to individuals.
Each team must supply a named reviewer and approve its contracts before dependent
integration work starts. No approval is implied by this document.

| Area                                                 | Proposed accountable team             | Required reviewers                | Named owner | Approval evidence |
| ---------------------------------------------------- | ------------------------------------- | --------------------------------- | ----------- | ----------------- |
| Public routes, version prefix, rate limits           | API Gateway                           | Website frontend/backend          | TBD         | Pending           |
| Registration, login, session and logout              | Gateway/Auth                          | Website backend; guest data owner | TBD         | Pending           |
| Room catalogue and prices                            | Website backend, ownership to confirm | Front Desk                        | TBD         | Pending           |
| Availability, maintenance and inventory reservations | Front Desk, ownership to confirm      | Website backend                   | TBD         | Pending           |
| Quotes, website bookings and self-service            | Website backend                       | Front Desk; website frontend      | TBD         | Pending           |
| Promotion publication, validation and redemption     | Manager Dashboard                     | Website backend                   | TBD         | Pending           |
| Payment creation, reconciliation and refunds         | Website backend                       | Gateway; Front Desk               | TBD         | Pending           |

Approval evidence must link a PR review, issue comment or team decision and record
the reviewer, date and approved document revision. A role label alone does not
satisfy the backlog's named-owner requirement.

## Shared conventions

- Proposed gateway prefix: `/api/v1`. Every path below is relative to it unless
  explicitly marked internal. The gateway owner must approve paths; they are not
  asserted to come from the SDS.
- JSON request and response bodies use camelCase. Successful responses are plain
  objects, with `{ "items": [], "nextCursor": null }` for collections. No global
  success envelope is currently implemented.
- Identifiers are UUID strings. `roomTypeId`, `bookingId`, `quoteId` and `paymentId`
  in examples are illustrative UUIDs, not production records.
- Money uses integer LKR minor units with `currency: "LKR"`. A value of `250000`
  means LKR 2,500.00. Server prices, discounts and totals are authoritative;
  clients never submit trusted amounts, guest ownership or booking status.
- Stay dates use `YYYY-MM-DD`, with check-in inclusive and check-out exclusive.
  Check-out must be after check-in. Timestamps use ISO-8601 UTC. Proposed hotel
  timezone is `Asia/Colombo`; check-in time and the exact cancellation cutoff
  remain decisions for the hotel and Front Desk.
- Reject unknown request fields and invalid values with `400 VALIDATION_FAILED`.
  Pagination proposes `limit` (default 20, range 1–100) and opaque `cursor`;
  invalid cursors return 400. Empty collections return 200 with an empty array.
- Guest routes derive identity from the authenticated session. Never accept a
  client-supplied `guestId` as ownership proof. Guest lists contain only their
  records; accessing another guest's booking returns proposed `403 FORBIDDEN`.
- Proposed browser transport is an HttpOnly, Secure session cookie; the gateway
  must agree its name, SameSite mode, expiry, CORS and CSRF protection, and how
  authenticated identity is forwarded to private services. Mutations require
  the agreed CSRF control. Do not store JWTs in localStorage or sessionStorage.
- Session, quotes, bookings and payments return `Cache-Control: no-store`.
  Availability must be rechecked on booking creation, regardless of caching.
- For booking, payment and cancellation creation, require `Idempotency-Key`.
  Proposed retention is 24 hours, scoped to guest and operation. A replay of the
  same body returns the original result without repeating the side effect;
  a different body under the same key returns `409 IDEMPOTENCY_CONFLICT`.
  Owners must approve retention, concurrent request handling and retry policy.

### Errors

```json
{
  "error": "ROOM_UNAVAILABLE",
  "message": "The selected room type is no longer available for these dates."
}
```

HTTP status carries the status code. `error` is a stable uppercase machine code;
`message` is safe display text. Clients must not parse message strings for business
logic. The current validation pipe joins validation messages into one string;
there is no structured `fieldErrors` property yet. A field-error extension needs
a separately agreed change to the shared filter and interface.

| Status | Code                                                                   | Meaning                                                                    |
| ------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 400    | VALIDATION_FAILED                                                      | Malformed input, invalid dates, occupancy or pagination                    |
| 401    | UNAUTHORIZED                                                           | Missing or expired guest session                                           |
| 401    | INVALID_CREDENTIALS                                                    | Generic login failure; no account existence detail                         |
| 403    | FORBIDDEN                                                              | Wrong role or another guest's record                                       |
| 403    | CSRF_FAILED                                                            | Proposed mutation protection failure                                       |
| 404    | ROOM_TYPE_NOT_FOUND / BOOKING_NOT_FOUND                                | Requested resource does not exist                                          |
| 409    | EMAIL_ALREADY_REGISTERED                                               | Proposed registration conflict; enumeration policy needs auth review       |
| 409    | ROOM_UNAVAILABLE                                                       | Inventory changed before reservation or confirmation                       |
| 409    | QUOTE_EXPIRED / PRICE_CHANGED                                          | Obtain and review a fresh quote                                            |
| 409    | BOOKING_NOT_PAYABLE                                                    | Booking is already paid, cancelled or its hold expired                     |
| 409    | BOOKING_CHANGE_NOT_ALLOWED                                             | Booking state or cancellation/modification cutoff disallows action         |
| 409    | IDEMPOTENCY_CONFLICT                                                   | Key reused with a different request                                        |
| 422    | PROMO_INVALID / PROMO_EXPIRED / PROMO_NOT_APPLICABLE / PROMO_EXHAUSTED | Promotion cannot be applied                                                |
| 422    | PAYMENT_OPTION_UNAVAILABLE                                             | Requested deposit/full option is not supported                             |
| 429    | TOO_MANY_REQUESTS                                                      | Gateway limit exceeded; proposed Retry-After header                        |
| 502    | PAYMENT_PROVIDER_UNAVAILABLE                                           | Payment provider request failed; reconcile before creating another attempt |
| 503    | DEPENDENCY_UNAVAILABLE                                                 | Inventory, auth or promotion service unavailable; do not assume success    |
| 500    | INTERNAL_SERVER_ERROR                                                  | Unexpected error; no stack trace or sensitive details                      |

Except for existing generic and validation handling, these domain codes are
proposed. Gateway-generated errors must use the same body or have a documented
adapter; that consistency is pending gateway approval.

## Endpoint catalogue

`Public` means no guest session. `Guest` requires the agreed authenticated guest
session. All error examples use the shared body and an explicit HTTP status.

| ID  | Method and proposed path                                                     | Access | Proposed owner              | Success                      | Main failure                   |
| --- | ---------------------------------------------------------------------------- | ------ | --------------------------- | ---------------------------- | ------------------------------ |
| R1  | GET /room-types?limit=20                                                     | Public | Website / Front Desk        | 200 room list                | 400 VALIDATION_FAILED          |
| R2  | GET /room-types/{roomTypeId}                                                 | Public | Website / Front Desk        | 200 room detail              | 404 ROOM_TYPE_NOT_FOUND        |
| A1  | GET /availability?roomTypeId=…&checkInDate=…&checkOutDate=…&numberOfGuests=2 | Public | Front Desk / Website        | 200 availability             | 400 VALIDATION_FAILED          |
| A2  | GET /room-types/{roomTypeId}/availability-calendar?from=…&to=…               | Public | Front Desk / Website        | 200 daily counts             | 404 ROOM_TYPE_NOT_FOUND        |
| G1  | POST /auth/guests/register                                                   | Public | Gateway/Auth                | 201 guest summary            | 409 EMAIL_ALREADY_REGISTERED   |
| G2  | POST /auth/login                                                             | Public | Gateway/Auth                | 200 session + cookie         | 401 INVALID_CREDENTIALS        |
| G3  | GET /auth/session                                                            | Guest  | Gateway/Auth                | 200 session                  | 401 UNAUTHORIZED               |
| G4  | POST /auth/logout                                                            | Guest  | Gateway/Auth                | 204, clear cookie            | 403 CSRF_FAILED                |
| P1  | GET /promotions?limit=20                                                     | Public | Manager Dashboard / Website | 200 active public promotions | 503 DEPENDENCY_UNAVAILABLE     |
| Q1  | POST /booking-quotes                                                         | Guest  | Website / Manager Dashboard | 201 quote                    | 422 PROMO_INVALID              |
| B1  | POST /bookings                                                               | Guest  | Website / Front Desk        | 201 pending booking          | 409 ROOM_UNAVAILABLE           |
| B2  | GET /bookings?period=upcoming&limit=20                                       | Guest  | Website                     | 200 own bookings             | 400 VALIDATION_FAILED          |
| B3  | GET /bookings/{bookingId}                                                    | Guest  | Website                     | 200 own booking              | 403 FORBIDDEN                  |
| B4  | PATCH /bookings/{bookingId}                                                  | Guest  | Website / Front Desk        | 200 changed booking          | 409 BOOKING_CHANGE_NOT_ALLOWED |
| B5  | POST /bookings/{bookingId}/cancellations                                     | Guest  | Website                     | 202 cancellation accepted    | 409 BOOKING_CHANGE_NOT_ALLOWED |
| T1  | POST /bookings/{bookingId}/payments                                          | Guest  | Website                     | 201 payment session          | 409 BOOKING_NOT_PAYABLE        |
| T2  | GET /bookings/{bookingId}/payments/{paymentId}                               | Guest  | Website                     | 200 payment state            | 403 FORBIDDEN                  |

### Rooms and availability examples (R1–A2)

R1: `GET /api/v1/room-types?limit=20` → 200:

```json
{
  "items": [
    {
      "roomTypeId": "11111111-1111-4111-8111-111111111111",
      "typeName": "Deluxe Double",
      "pricePerNight": 250000,
      "currency": "LKR",
      "maxGuests": 2,
      "imageUrls": ["/images/deluxe-double.webp"],
      "amenities": ["Wi-Fi"]
    }
  ],
  "nextCursor": null
}
```

R2: `GET /api/v1/room-types/11111111-1111-4111-8111-111111111111` → 200:

```json
{
  "roomTypeId": "11111111-1111-4111-8111-111111111111",
  "typeName": "Deluxe Double",
  "description": "A double room for two guests.",
  "pricePerNight": 250000,
  "currency": "LKR",
  "maxGuests": 2,
  "imageUrls": ["/images/deluxe-double.webp"],
  "amenities": ["Wi-Fi"]
}
```

A1: `GET /api/v1/availability?roomTypeId=11111111-1111-4111-8111-111111111111&checkInDate=2026-12-10&checkOutDate=2026-12-12&numberOfGuests=2` → 200:

```json
{
  "roomTypeId": "11111111-1111-4111-8111-111111111111",
  "checkInDate": "2026-12-10",
  "checkOutDate": "2026-12-12",
  "numberOfGuests": 2,
  "availableCount": 3,
  "checkedAt": "2026-09-29T06:00:00Z"
}
```

A2: `GET /api/v1/room-types/11111111-1111-4111-8111-111111111111/availability-calendar?from=2026-12-10&to=2026-12-12` → 200:

```json
{
  "roomTypeId": "11111111-1111-4111-8111-111111111111",
  "days": [
    { "date": "2026-12-10", "availableCount": 3 },
    { "date": "2026-12-11", "availableCount": 0 }
  ],
  "checkedAt": "2026-09-29T06:00:00Z"
}
```

Calendar `to` is exclusive. Proposed maximum query range is 90 nights. Individual
daily counts do not guarantee a continuous stay; A1 must check full-stay
assignability. Occupancy is a positive integer within room capacity. Maintenance
blocks and overlapping reservations must be included. Zero inventory is a valid
200 search result, not an error; a failed reservation is 409.

R1/A1 invalid query → 400:

```json
{ "error": "VALIDATION_FAILED", "message": "Check-out must be after check-in." }
```

R2/A2 unknown UUID → 404:

```json
{
  "error": "ROOM_TYPE_NOT_FOUND",
  "message": "The requested room type does not exist."
}
```

### Guest authentication examples (G1–G4)

G1 request (synthetic example only):

```json
{
  "fullName": "Example Guest",
  "email": "guest@example.test",
  "password": "Example-only-password-123!"
}
```

G1 → 201, without password, hash or token:

```json
{
  "guestId": "22222222-2222-4222-8222-222222222222",
  "fullName": "Example Guest",
  "email": "guest@example.test"
}
```

G1 duplicate email → 409:

```json
{
  "error": "EMAIL_ALREADY_REGISTERED",
  "message": "Registration could not be completed with this email."
}
```

G2 request:

```json
{ "email": "guest@example.test", "password": "Example-only-password-123!" }
```

G2 and G3 → 200 (G2 also sets the agreed session cookie):

```json
{
  "user": {
    "guestId": "22222222-2222-4222-8222-222222222222",
    "fullName": "Example Guest",
    "role": "GUEST"
  },
  "expiresAt": "2026-09-30T06:00:00Z"
}
```

The expiry illustrates a 24-hour session; auth owners must resolve the website
session lifetime independently of the checked-in Guest App's room-linked token.

G2 wrong password → 401:

```json
{ "error": "INVALID_CREDENTIALS", "message": "Email or password is incorrect." }
```

G3 expired/missing cookie → 401:

```json
{ "error": "UNAUTHORIZED", "message": "Please sign in to continue." }
```

G4 has no body; success is 204 with an empty body and expired session cookie.
An already absent session may also return 204. Failed CSRF verification → 403:

```json
{ "error": "CSRF_FAILED", "message": "The request could not be verified." }
```

Normalize email by trimming and lowercasing (maximum 320 characters); full name
is required (maximum 255). Password rules, registration enumeration behavior,
welcome email delivery and session invalidation must be approved by Auth. The
website must not independently issue tokens while auth ownership is unresolved.

### Promotions and quotes (P1, Q1)

P1: `GET /api/v1/promotions?limit=20` → 200:

```json
{
  "items": [
    {
      "promoId": "33333333-3333-4333-8333-333333333333",
      "code": "STAY10",
      "discountType": "PERCENTAGE",
      "discountValue": 10,
      "currency": "LKR",
      "validFrom": "2026-12-01T00:00:00Z",
      "validUntil": "2027-01-01T00:00:00Z",
      "roomTypeIds": ["11111111-1111-4111-8111-111111111111"]
    }
  ],
  "nextCursor": null
}
```

Only explicitly published promotions are public. Percentage values are 1–100;
fixed discounts use LKR minor units. Boundary times, rounding and eligible room
types require Manager Dashboard agreement. P1 unavailable upstream → 503:

```json
{
  "error": "DEPENDENCY_UNAVAILABLE",
  "message": "Promotions are temporarily unavailable."
}
```

Q1 request:

```json
{
  "roomTypeId": "11111111-1111-4111-8111-111111111111",
  "checkInDate": "2026-12-10",
  "checkOutDate": "2026-12-12",
  "numberOfGuests": 2,
  "promoCode": "STAY10"
}
```

Q1 → 201:

```json
{
  "quoteId": "44444444-4444-4444-8444-444444444444",
  "roomTypeId": "11111111-1111-4111-8111-111111111111",
  "checkInDate": "2026-12-10",
  "checkOutDate": "2026-12-12",
  "numberOfGuests": 2,
  "nights": 2,
  "subtotal": 500000,
  "discountAmount": 50000,
  "taxAmount": 0,
  "totalAmount": 450000,
  "currency": "LKR",
  "promoCode": "STAY10",
  "expiresAt": "2026-09-29T06:10:00Z",
  "paymentOptions": [{ "type": "FULL", "amountDue": 450000 }]
}
```

The example proposes a ten-minute quote and zero illustrative tax; neither is
hotel policy. A quote belongs to the current guest and does not reserve inventory
or redeem a promotion. Omit `promoCode` when unused; normalize supplied codes to
uppercase, allow letters/digits/hyphens/underscores, maximum 50 characters. Never
silently ignore an invalid code. Q1 unknown code → 422:

```json
{ "error": "PROMO_INVALID", "message": "The promotion code is not valid." }
```

Expiry, exhaustion and ineligible room types use the respective 422 codes in the
error table. Revalidate the promotion and price when consuming the quote.

### Bookings and self-service (B1–B5)

B1 request, with `Idempotency-Key: example-booking-attempt-1`:

```json
{
  "quoteId": "44444444-4444-4444-8444-444444444444",
  "specialRequests": "Quiet room if available."
}
```

B1 → 201; the same booking shape is returned by B3:

```json
{
  "bookingId": "55555555-5555-4555-8555-555555555555",
  "roomTypeId": "11111111-1111-4111-8111-111111111111",
  "checkInDate": "2026-12-10",
  "checkOutDate": "2026-12-12",
  "numberOfGuests": 2,
  "specialRequests": "Quiet room if available.",
  "status": "PENDING",
  "totalAmount": 450000,
  "currency": "LKR",
  "paidAmount": 0,
  "balanceAmount": 450000,
  "holdExpiresAt": "2026-09-29T06:20:00Z",
  "version": 1
}
```

Special requests are optional plain text, maximum 300 characters. The proposed
20-minute hold is illustrative and needs inventory/payment owner agreement.
Booking creation must atomically reserve inventory across website and Front Desk
writers. A local availability read followed by an insert alone is insufficient.
No confirmed booking is created before verified payment.

B1 lost inventory → 409:

```json
{
  "error": "ROOM_UNAVAILABLE",
  "message": "The selected room type is no longer available for these dates."
}
```

B2: `GET /api/v1/bookings?period=upcoming&limit=20` → 200:

```json
{
  "items": [
    {
      "bookingId": "55555555-5555-4555-8555-555555555555",
      "roomTypeId": "11111111-1111-4111-8111-111111111111",
      "checkInDate": "2026-12-10",
      "checkOutDate": "2026-12-12",
      "status": "PENDING",
      "totalAmount": 450000,
      "currency": "LKR"
    }
  ],
  "nextCursor": null
}
```

Proposed `period` values: `upcoming`, `past`, `all` (default). Define past as
check-out on or before the hotel-local current date; upcoming is later. Order by
check-in date descending and booking ID as a stable tie-breaker. B2 bad period → 400:

```json
{
  "error": "VALIDATION_FAILED",
  "message": "Period must be upcoming, past or all."
}
```

B3: `GET /api/v1/bookings/55555555-5555-4555-8555-555555555555` returns the B1
shape with current state. B3 or T2 cross-guest access → 403:

```json
{ "error": "FORBIDDEN", "message": "You cannot access this booking." }
```

B4 request uses a fresh Q1 quote and optimistic version protection:

```json
{
  "quoteId": "66666666-6666-4666-8666-666666666666",
  "expectedVersion": 1,
  "specialRequests": "Quiet room if available."
}
```

B4 → 200, illustrative same-price modification:

```json
{
  "bookingId": "55555555-5555-4555-8555-555555555555",
  "roomTypeId": "11111111-1111-4111-8111-111111111111",
  "checkInDate": "2026-12-11",
  "checkOutDate": "2026-12-13",
  "numberOfGuests": 2,
  "specialRequests": "Quiet room if available.",
  "status": "CONFIRMED",
  "totalAmount": 450000,
  "currency": "LKR",
  "paidAmount": 450000,
  "balanceAmount": 0,
  "holdExpiresAt": null,
  "version": 2
}
```

Stale versions return `409 BOOKING_VERSION_CONFLICT`; an identical retry with an
old version must refetch, not apply a second change. Keep the original reservation
until replacement inventory is secured. Additional collection, partial refunds
and the corresponding modification states remain blocked on policy decisions.

B5 request, with `Idempotency-Key: example-cancellation-1`:

```json
{ "expectedVersion": 2, "reason": "Travel plans changed." }
```

B5 → 202:

```json
{
  "bookingId": "55555555-5555-4555-8555-555555555555",
  "status": "CANCELLED",
  "refundStatus": "PENDING",
  "version": 3
}
```

Cancellation retains booking/payment audit records and releases inventory once.
Refund state is separate; 202 does not assert a successful refund. Use
`NOT_REQUIRED` for unpaid bookings. Exact refund amounts and settlement timing
must be agreed before implementing this response. Proposed reason maximum: 300.

B4/B5 within the cutoff or in a disallowed state → 409:

```json
{
  "error": "BOOKING_CHANGE_NOT_ALLOWED",
  "message": "This booking cannot be changed or cancelled under the current policy."
}
```

The project notes describe a 24-hour cutoff, but exact equality, check-in time,
applicable states and refund policy need approval. Do not invent those rules in code.

### Payments (T1–T2)

Proposed example uses hosted checkout. Embedded PaymentIntent is an alternative
in the source notes; the team must select one before integrating Stripe.

T1 request, with `Idempotency-Key: example-payment-attempt-1`:

```json
{ "paymentType": "FULL" }
```

T1 → 201:

```json
{
  "paymentId": "77777777-7777-4777-8777-777777777777",
  "bookingId": "55555555-5555-4555-8555-555555555555",
  "status": "PENDING",
  "paymentType": "FULL",
  "amount": 450000,
  "currency": "LKR",
  "checkoutUrl": "https://payments.example.test/session/example",
  "expiresAt": "2026-09-29T06:20:00Z"
}
```

The URL is an inert placeholder, not a provider endpoint. The backend chooses
trusted return URLs and computes the amount. Do not accept arbitrary return URLs,
card fields or amounts from the browser. An `ADVANCE` option can only be offered
after deposit policy is defined; otherwise return `422 PAYMENT_OPTION_UNAVAILABLE`.

T1 already paid/cancelled/expired booking → 409:

```json
{
  "error": "BOOKING_NOT_PAYABLE",
  "message": "This booking cannot accept a new payment."
}
```

T2: `GET /api/v1/bookings/55555555-5555-4555-8555-555555555555/payments/77777777-7777-4777-8777-777777777777` → 200:

```json
{
  "paymentId": "77777777-7777-4777-8777-777777777777",
  "bookingId": "55555555-5555-4555-8555-555555555555",
  "status": "SUCCEEDED",
  "paymentType": "FULL",
  "amount": 450000,
  "currency": "LKR",
  "paidAt": "2026-09-29T06:12:00Z",
  "bookingStatus": "CONFIRMED"
}
```

Proposed payment states: `PENDING`, `SUCCEEDED`, `FAILED`; refunds have separate
states `NOT_REQUIRED`, `PENDING`, `SUCCEEDED`, `FAILED`. T2 missing payment, or a
payment not belonging to the specified owned booking, returns
`404 PAYMENT_NOT_FOUND`. T2 cross-guest failure is shown under B3.

Only a verified provider event can mark payment successful and trigger booking
confirmation. A browser redirect is not proof of payment. Duplicate events must
not duplicate charges, confirmations, inventory changes or confirmation emails.
Late success after inventory-hold expiry requires reconciliation/refund handling;
do not confirm a booking whose inventory has already been reassigned.

The provider webhook's path, signature handling and event schema are intentionally
not invented here. They require the selected provider flow and current official
provider specification during implementation; it is not a guest-authenticated
browser route. The gateway must explicitly route and protect it accordingly.

## Cross-service agreements required

| Producer / consumer               | Required contract                                                                      | Failure behavior and unresolved decision                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Gateway/Auth → Website            | Verified guest identity, role and session expiry; trusted forwarding mechanism         | Reject unauthenticated access; gateway must remove spoofed identity headers; no public direct backend access |
| Front Desk ↔ Website              | Date-range capacity lookup plus atomic reserve, replace, release and expiry operations | Fail closed on outage; agree one inventory authority and conflict handling across all booking channels       |
| Manager Dashboard → Website       | Published active promotion snapshot and deactivation updates                           | Agree event vs synchronous API, stale data limit and final authoritative validation                          |
| Website ↔ Manager Dashboard       | Reserve/commit/release redemption for capped promotions                                | Agree atomic redemption ownership, retries and abandoned-payment release                                     |
| Payment handler → Booking service | Verified, deduplicated payment result correlated to booking                            | Agree late/out-of-order events, reconciliation, hold expiry and refund policy                                |
| Booking service → Email delivery  | Confirmation/change notification after durable state transition                        | Retry delivery independently; an email failure must not reverse a paid booking                               |

Internal routes and event names remain TBD; the table defines needed capabilities,
not deployed services. The website frontend uses REST under the current folder
standard; any real-time promotion requirement must be reconciled with that rule.

## Decision log and sign-off checklist

Every item is pending. Record the decision, named approver, date and evidence link
in this table as the team reviews the draft.

| ID  | Decision needed                                                                       | Required approvers                        | Decision / evidence |
| --- | ------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------- |
| D1  | Gateway prefix, route ownership, public/protected mappings and common errors          | Gateway + Website                         | Pending             |
| D2  | Credential/guest data ownership, cookie/CSRF/session contract and identity forwarding | Auth + Website                            | Pending             |
| D3  | Catalogue owner, prices/taxes and room image/amenity schema                           | Front Desk + Website                      | Pending             |
| D4  | Atomic inventory authority, maintenance blocks, quote/hold lifetimes and expiry       | Front Desk + Website                      | Pending             |
| D5  | Promotion publication, rounding, redemption limits and consistency                    | Manager Dashboard + Website               | Pending             |
| D6  | Hosted checkout vs embedded flow; full/deposit rules and late-payment reconciliation  | Website + hotel policy owner + Gateway    | Pending             |
| D7  | Check-in time/timezone, exact 24-hour boundary, modifications and refunds             | Hotel policy owner + Front Desk + Website | Pending             |
| D8  | Validation limits, paging, idempotency retention and compatibility/version policy     | All API owners                            | Pending             |
| D9  | Verify SRS IDs and record named owner approval for every area                         | Website lead + all owners                 | Pending             |

Breaking changes to approved field types, meaning, paths or status codes require
consumer review and an agreed migration/version plan. Update examples and future
OpenAPI definitions together. Do not silently overwrite approved decisions.

## Review and verification

Documentation review can be completed before endpoints exist. Runtime tests and
generated OpenAPI belong to the feature implementation tasks; this draft is not
evidence that integrations pass.

| Review case                                    | Expected contract outcome                                       | Evidence status                               |
| ---------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------- |
| Each R/G/A/P/Q/B/T operation                   | Request, success response and failure example are present       | Draft examples included; owner review pending |
| Room sold after availability search            | B1 returns 409 ROOM_UNAVAILABLE; no double reservation          | Specified; runtime test pending               |
| Invalid, expired or exhausted promo            | Q1 rejects with stable 422 code; no silent discount removal     | Specified; runtime test pending               |
| Expired session or another guest's booking     | 401 or 403; no guest record returned                            | Specified; auth sign-off pending              |
| Duplicate booking/payment/cancellation request | Same key/body does not repeat side effects                      | Specified; retention decision pending         |
| Duplicate or late payment event                | No duplicate confirmation; expired inventory is reconciled      | Specified; provider/policy agreement pending  |
| Concurrent modification                        | Stale version rejected; original inventory preserved on failure | Specified; runtime test pending               |
| Date, money and cutoff boundaries              | Correct end-exclusive dates and integer arithmetic              | Cutoff/tax/deposit decisions pending          |
| Cross-team completion                          | Named owners and linked approvals for every contract            | Pending; DDP-#06 must remain open             |

To finish DDP-#06, resolve D1–D9, add named owner sign-offs, verify traceability,
and attach the reviewed document to the actual GitHub issue. Until then this is
a reviewable draft, not a team agreement.
