# Stripe test checkout — GitHub #178 / DDP-#25

Legacy reference: new checkout now uses [PayHere](payhere-checkout.md).
Only the Stripe webhook remains registered for pre-existing Stripe attempts.

## Approved behavior

The user approved **full payment only for now** and a **35-minute payment hold**.
Room/date browsing and quote refresh still create no holds. Clicking Continue to
Stripe creates/reuses the existing PENDING checkout and extends its hold once to
35 minutes. Its price snapshot is unchanged; payment metadata is a nested object
inside that snapshot. No new database tables or columns are introduced.

Hosted Stripe Checkout collects card details. Only test credentials (`sk_test_`)
are accepted; live keys/events are rejected. The official Stripe Node SDK is
pinned in the lockfile. No card numbers, CVV or raw provider events are stored.
`payments.stripe_ref` stores the Checkout Session reference.

The code can calculate an explicitly configured future deposit, preserving the
ticket's deposit extension point, but `PAYMENT_DEPOSIT_PERCENT` is unset by
default. No deposit rate has been approved or enabled by this change.

## Configuration (set manually; real environment files were not edited)

Add these to the **backend** development environment using your Stripe test
account's actual values. Never commit or paste the keys into chat.

```dotenv
STRIPE_SECRET_KEY=sk_test_REPLACE_WITH_YOUR_TEST_KEY
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_WITH_YOUR_LISTENER_SECRET
PAYMENT_RETURN_ORIGIN=http://localhost:3001
```

`STRIPE_CHECKOUT_MINUTES` defaults to the approved 35. An explicit override must
be 31–120 minutes, allowing a margin over Stripe's minimum. Leave
`PAYMENT_DEPOSIT_PERCENT` unset for the approved full-payment-only flow. Existing
JWT, gateway, pricing-policy and database configuration remains required.

Stripe requires at least 30 minutes for hosted sessions. The booking hold and
session share one deadline, so the old 20-minute pre-payment hold is not released
while the hosted session is still intended to be payable. Retrying does not
extend this deadline again. A transport failure uses the same payment ID and
Stripe idempotency key; it cannot silently create a different Checkout Session.

Outside test/development, HTTPS is required for the return origin. Local HTTP is
accepted only for localhost/127.0.0.1. Redirect destinations are server-generated,
and the browser accepts hosted URLs only on `https://checkout.stripe.com`.

## Endpoints

All paths below are gateway paths; the existing `/hw` mapping removes that prefix.
Guest routes require a guest bearer JWT, not a browser-supplied guest ID.

| Method/path                           | Behavior                                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /hw/payments/options`            | Availability, enabled deposit percentage (normally null) and hold minutes; no hold created.                                          |
| `POST /hw/payments/checkout`          | Create/reuse an owned reservation, prepare one payment and obtain hosted checkout. Requires `Idempotency-Key`.                       |
| `GET /hw/payments/recovery/:quoteId`  | Find the current guest's still-active pending attempt for refresh recovery.                                                          |
| `POST /hw/payments/:bookingId/resume` | Resume the same payment/session; never multiply holds or charge attempts.                                                            |
| `POST /hw/payments/:bookingId/cancel` | Expire an open Stripe session and verify its current state; cannot cancel a concurrently paid stay as an unpaid checkout.            |
| `GET /hw/payments/:bookingId`         | Owned booking, frozen lines, status, amount paid, balance and payment reference. Reconciles verified provider state where available. |
| `POST /hw/payments/stripe/webhook`    | Public, raw-body Stripe-signature verification. No guest JWT.                                                                        |

Start request:

```json
{
  "quoteToken": "COMPLETE_TOKEN_FROM_THE_QUOTE_API",
  "specialRequests": "Quiet room if possible.",
  "paymentOption": "FULL"
}
```

Amounts and return URLs cannot be submitted by the browser. Resume accepts only
`{ "paymentOption": "FULL" }`. Unsupported/card/price fields are rejected.
Starting an unconfigured deposit fails before taking a hold.

Start returns `{ bookingId, checkoutUrl, state }`. `checkoutUrl: null` with
`RETRY_REQUIRED` means a durable checkout may exist, not a payment success. Go to
the authenticated confirmation/status route and resume that identity. The server
action records a safe quote UUID in an HttpOnly recovery cookie; tokens and guest
form details are not put into browser storage or URLs. A failed recovery lookup
blocks starting a different payment until it can be checked.

## Verification, concurrency and recovery

- Nest enables `rawBody`; the gateway already preserves bytes and forwards
  `Stripe-Signature`. The SDK verifies the signature/timestamp. Forged, modified
  and live-mode events cannot confirm a booking.
- Subscribe to `checkout.session.completed`, `checkout.session.expired`,
  `checkout.session.async_payment_succeeded` and
  `checkout.session.async_payment_failed`. Other event types are acknowledged
  without changing payments. The flow currently permits card payments only.
- A webhook or owned status refresh retrieves the Session from Stripe. Metadata,
  booking identity, payment identity, test mode, currency and exact stored amount
  must match. A success redirect or callback's claimed amount is insufficient.
- Short READ COMMITTED transactions lock the shared room-type row, then the
  booking/payment. They recheck ownership and the hold using DB time. Provider
  network calls occur outside these locks. A matched paid Session confirms and
  records payment atomically. Replays neither add payments nor downgrade a paid
  record when an older failure/expiry arrives.
- Payment preparation is persisted before provider IO. A deterministic provider
  idempotency key is derived from its durable payment ID; session retries use the
  same frozen amount, expiry and identity. Stripe's idempotency retention exceeds
  this checkout's lifetime. Uncertain errors leave a recoverable pending attempt.
- A closed unpaid/failed session cancels the pending checkout. A card decline
  within an open hosted session may be retried there until its deadline.
- A payment first processed after its hold expires, or after cancellation, must
  **not** reclaim released inventory. It is recorded with durable refund-required
  metadata, then refunded through an idempotent Stripe request. Pending/failed
  refund verification is not reported as refunded; webhook failure requests a
  Stripe retry and guest status refresh can also retry reconciliation. Retain
  the reference and contact the hotel if provider retries cannot resolve it.
- Refund success is verified through Stripe before marking REFUNDED. Cancelled
  or expired checkouts do not show a remaining balance as money owed. Administrative
  refunds outside this checkout workflow need a separate reconciliation contract.

Front Desk and maintenance writers still need the shared inventory-locking
protocol; website changes do not prove external services honor it. No new
background worker is installed: availability treats expired holds as released,
while webhooks/status reconciliation finish payment state. Operations must monitor
failed webhook delivery and refund-required records and replay unresolved events.

## Frontend and document boundaries

The Payment step shows the full server quote and links to Stripe test checkout.
`/booking/confirmation?bookingId=...` uses authenticated backend status; adding
`success=true` to the URL changes nothing. It shows pending/cancelled/expired,
refund-pending/refunded or genuinely confirmed state with room/guest details,
dates/nights/occupancy, original line items, currency, paid amount and balance.
Provider verification failure preserves the last recorded status with a warning.

Print has a readable white summary and hides navigation/actions. An authorized
PDF-generation/download contract is not implemented; the UI explains Print/Save
as PDF as the available alternative. Record that document endpoint follow-up
under #06. Confirmed-stay modification/cancellation remains #29. Email #26 is
implemented in [the confirmation email flow](booking-confirmation-email.md);
provider acceptance and sandbox validation never claim delivery. Promo application remains
the documented incomplete part of #24 and is not advertised in payment totals.

## Manual Stripe test

1. Configure the backend test keys/return origin above. Use the existing five
   checkout columns plus existing `payments` table/indexes; no new migration.
2. Start backend, gateway and frontend. Sign in with a development guest.
3. In a separate terminal run the installed Stripe CLI:
   `stripe listen --forward-to http://localhost:8080/hw/payments/stripe/webhook`.
   Copy its `whsec_...` into the backend's webhook secret and restart the backend.
   Use your gateway port if different. No real provider calls were made by tests.
4. Search available future dates, select/configure a room and request a quote.
   Confirm the guest email, review the total and Continue to Stripe test checkout.
5. Use Stripe's test card `4242 4242 4242 4242`, a future expiry and any valid test
   CVC. Never use real card details. Return to the hotel's status page.
6. Confirm the real booking reference, CONFIRMED status, frozen total, full paid
   amount and zero balance. Refresh and replay the same event from Stripe's event
   tooling: there must still be one payment row and one confirmation transition.
7. Try Stripe's declined-card fixture from its testing documentation, then retry
   in the same hosted session. No success should appear for the declined attempt.
8. Cancel an unpaid checkout via its status page and verify cancellation/failed
   payment without paid amount. A browser cancel redirect alone is only a hint;
   it cannot override an already completed payment.
9. Open a pending booking URL with `&success=true`: it must remain pending until
   verified. Stop webhook forwarding, complete another test payment and refresh
   status to exercise authoritative API recovery rather than redirect trust.
10. Check Print and the email status. PDF download remains unavailable;
    sandbox email must report validation without delivery.

## Automated evidence

Verified: 297 backend unit/HTTP tests (41 suites), 20 focused PostgreSQL
integration tests, 36 frontend tests, both builds and lint. Backend unit line
coverage is 91.71%. The five new persistence tests use only temporary copies;
the remaining 15 check existing booking/mapping behavior. The isolated browser
flow passes. A new multi-connection payment preparation/settlement race test is
included in the existing disposable-CI race suite and was not run locally.

Unit/HTTP tests cover auth/validation, signature tampering, provider configuration,
idempotent provider parameters, recovery identities, amount binding, replay,
failed/late payment/refund recovery and configured-deposit arithmetic. PostgreSQL
tests use temporary table copies with rollback; no live records/schema are
modified. Browser fixtures cover full-payment handoff, forged returns, refresh
recovery without another checkout, confirmed details and print. They do not
contact Stripe, so actual provider acceptance still requires the manual test.

Run backend build/lint/unit coverage and the focused integration suites, then
frontend build/tests/coverage and `npm run test:booking-ui`. Existing integration
fixtures now recognize already-migrated temporary booking copies instead of
trying to add the five checkout columns twice.

References: [Stripe Checkout creation](https://docs.stripe.com/api/checkout/sessions/create),
[Stripe event verification and retries](https://docs.stripe.com/events/manage-webhook-endpoints),
[refunds](https://docs.stripe.com/api/refunds/create),
[test cards](https://docs.stripe.com/testing).
