# PayHere checkout and Brevo confirmation

The user selected PayHere for the real Sri Lankan hotel. New checkouts now use
PayHere instead of Stripe. This replaces the active checkout/options/resume/status
and cancellation handlers; the old Stripe webhook remains only for settling
pre-existing Stripe attempts. Old Stripe holds cannot be resumed as PayHere orders.
Do not remove legacy credentials until any existing Stripe attempts are resolved.

## Configuration

Set these manually in `backend/.env`. Real credentials were not edited.

```dotenv
PAYHERE_MODE=sandbox
PAYHERE_MERCHANT_ID=your-sandbox-merchant-id
PAYHERE_MERCHANT_SECRET=your-domain-specific-secret
PAYHERE_APP_ID=your-retrieval-app-id
PAYHERE_APP_SECRET=your-retrieval-app-secret
PAYHERE_NOTIFY_URL=https://your-public-gateway.example/hw/payments/payhere/notify
PAYMENT_RETURN_ORIGIN=http://localhost:3001
BOOKING_EMAIL_MODE=sandbox
```

Reuse the existing BREVO_API_KEY and CONTACT_EMAIL_FROM, or override the sender
with BOOKING_EMAIL_FROM. PayHere defaults to off. Live checkout requires
PAYHERE_MODE=live, NODE_ENV=production and an HTTPS frontend origin. Use the
hotel-owned approved merchant account, domain-specific secret and live API
credentials. No live payment was attempted by this implementation.

Find the Merchant ID and domain-specific Merchant Secret under Integrations.
Create a separate API key for Retrieval and obtain App ID and App Secret.
The backend generates Basic authorization internally: do not paste credentials
into third-party encoding websites. Live Merchant API access requires PayHere
server-IP approval. See the official
[Checkout](https://support.payhere.lk/api-&-mobile-sdk/checkout-api) and
[Retrieval](https://support.payhere.lk/api-&-mobile-sdk/retrieval-api) documentation.

PayHere must reach the notify URL over public HTTPS. During local development,
use a public HTTPS tunnel to the gateway's port 8080, preserve the `/hw` route,
and configure that URL in PAYHERE_NOTIFY_URL. No Stripe CLI is involved.
The domain must be allowed in PayHere. Return origin can stay localhost in sandbox.

## Required database change

The shared enum currently only supports STRIPE, CASH and CARD_ON_SITE. The service
does not alter it automatically or label PayHere as Stripe. Ask forever-hotel/infra
to approve and deploy [the enum migration](payhere-storage-proposal.sql).
PayHere options remain unavailable until PAYHERE exists in payment_method.
Existing approved booking checkout columns and price_snapshot are also required.

On a disposable local database only, apply the proposal with:

```powershell
psql -v ON_ERROR_STOP=1 -h YOUR_TEST_HOST -U YOUR_TEST_USER -d YOUR_TEST_DB -f documents/api/payhere-storage-proposal.sql
```

Execute outside a transaction before inserting PAYHERE values. No new tables,
columns or edits to the checked-in infra schema are introduced. Production/shared
database application remains the infrastructure owner's responsibility.

## API and browser contract

Gateway `/hw` prefixes are stripped upstream. Guest endpoints require bearer JWTs.

| Route | Behavior |
| --- | --- |
| GET /hw/payments/options | Availability, null depositPercent, checkoutMinutes=35 and sandbox flag |
| POST /hw/payments/checkout | Signed quote, specialRequests, paymentOption=FULL, billing and Idempotency-Key |
| GET /hw/payments/recovery/:quoteId | Owned pending checkout recovery |
| POST /hw/payments/:bookingId/resume | Reconcile existing order, reuse frozen payment/hold/billing |
| GET /hw/payments/:bookingId | Reconcile via Retrieval, return owned payment and email status |
| POST /hw/payments/:bookingId/cancel | Verify first, then cancel only an unpaid pending hotel hold |
| POST /hw/payments/payhere/notify | Public form-encoded callback; signature and Retrieval checks required |

Billing contains firstName, lastName, phone, address, city and country. Email comes
from the owned guest record. No dummy billing fields are invented. Missing billing
is rejected before a hold is created. Full payment only is enabled.

Checkout success returns `{ bookingId, state: "READY", checkout: { action, fields } }`.
It replaces the Stripe checkoutUrl response. The frontend accepts only the exact
PayHere sandbox/live HTTPS form action and the expected fields, then submits POST.
Prices, merchant identity, order ID, return URLs and hashes are generated server-side.
The merchant secret and OAuth credentials never reach the browser.

The existing snapshot payment object holds provider=PAYHERE, environment, order ID
(the durable payment UUID), billing, provider references and receipt reconciliation
state. Status removes that internal metadata. Payments use payment_method=PAYHERE;
stripe_ref stays null. No card details/raw callback bodies are stored or logged.
Billing is retained in the backend for resume; it is not placed in URLs, browser
storage, logs or the public pricing snapshot. Apply the hotel's retention policy.

## Verification and edge behavior

Checksums follow PayHere's protocol using exact two-decimal major-unit amounts
derived from integer LKR cents. A timing-safe comparison verifies notifications.
Merchant, currency, order and amount must match. Because the checksum does not
cover payment_id, Retrieval independently corroborates the provider reference
before settlement. Sandbox and live attempts cannot be mixed.

The existing inventory-first locks serialize preparation, settlement, expiry and
cancellation. A successful verified receipt confirms only a still-valid PENDING
hold. Redirects and status_code=0/-1/-2 callbacks never confirm a booking or release
inventory during a concurrent success. Provider verification failures preserve
stored state with verificationDelayed; cancellation fails closed on outages.

Retries reuse one payment/order and do not extend the 35-minute hold again.
When an older pending checkout exists, booking navigation now shows an explicit
review/cancel choice instead of silently redirecting new room/date selections
to the old booking. The old price stays frozen. Continuing with a new selection
requires server-verified unpaid cancellation; only then is its recovery cookie
cleared and a fresh quote requested. A failed cancellation or paid booking never
clears recovery or permits this replacement flow.
PayHere does not guarantee unique order IDs or support expiring a hosted form
through the Checkout API. Reposting a form may create another real charge.
Retrieval detects distinct references: each real charge is recorded once, while
callbacks replaying the same reference do not add another payment row.

Late payments, additional charges, refund requests and chargebacks produce
REVIEW_REQUIRED and/or PENDING refund status and a payhere_payment_review_required
log. They never reclaim released inventory or trigger confirmation email. A
provider refund is marked REFUNDED only after Retrieval verifies it; stale RECEIVED
results cannot reverse that state. Brevo email errors preserve settled payments.

**Refund operations are manual in this version.** Staff must monitor review logs,
verify provider transactions in the hotel merchant portal, refund as appropriate,
and refresh status to reconcile. Automatic refund API requests, scheduled recovery
and broader booking modification/cancellation workflows remain follow-ups. There
is no claim that cancelling the hotel hold cancels a hosted PayHere form. Confirm
this operational process with the hotel before enabling live payments.

## Test and demo steps

1. Use a disposable database with the team schema and approved checkout columns;
   apply the PayHere enum proposal locally.
2. Configure sandbox credentials, the public notify URL and Brevo sandbox above.
3. Start backend, gateway and frontend, then sign in and request a fresh quote.
4. Enter real test billing details. Confirm the visible Sandbox notice and total.
5. Continue to PayHere; use only PayHere's documented sandbox card fixtures from
   [Sandbox & Testing](https://support.payhere.lk/sandbox-and-testing).
6. Return to the owned confirmation page. After callback/reconciliation, expect
   CONFIRMED, the exact paid amount, zero balance and Brevo SANDBOX status.
7. Replay a signed callback and refresh: one payment row and one email request.
8. Test a failed payment, expired hold, different guest and callback tampering.
   A forged return URL cannot confirm; late success requires refund review.

Backend commands: `npm run test:cov -- --runInBand`, `npm run test:integration`,
`npm run build`, `npm run lint`, `npm run format:check`. The new database fixtures
use connection-local enums/tables or a generated isolated schema; they do not
apply the proposal to public. Enable BOOKING_RACE_TEST=true only on a disposable
localhost database with CI=true. Frontend: `npm test`, `npm run typecheck`,
`npm run lint`, `npm run build`. Provider calls are mocked in automated tests;
real sandbox/merchant approval remains a separate manual verification.

## Local verification

On 23 October 2026, 373 backend unit tests and 60 PostgreSQL integration tests
passed, including concurrent PayHere preparation/settlement and receipt claims.
Backend coverage passed all 80% gates (88.36% lines, 82.98% branches). The 38
frontend tests, browser booking smoke, frontend build/typecheck/lint and backend
build/lint/format checks passed. PayHere and Brevo requests were mocked; no real
payments/emails or shared database changes were made. Database checks used
isolated PostgreSQL 18; CI PostgreSQL 16 still needs to pass.

The new PayHere repository has 100% statements, branches, functions and lines
under the focused PostgreSQL coverage run.

The new gateway callback-forwarding test passes. The full gateway suite currently
has an unrelated ambiguous-path check returning 404 instead of expected 400;
gateway lint also reports an existing unused `require` in eslint.config.mjs.
No gateway runtime changes were needed for form callback forwarding.
