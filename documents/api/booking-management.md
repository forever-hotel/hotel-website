# Booking modification and cancellation (DDP-#28)

These backend APIs let the signed-in owner modify or cancel a confirmed website
booking. DDP-#29 owns the dashboard controls. The existing `/hw` gateway route
already forwards them; no gateway configuration change is needed.

## Policy

The user selected full refunds for eligible cancellations and staff review of
price differences. Development/test use the provisional project setting of
**14:00 check-in in Asia/Colombo**. The hotel must confirm that hour before
production. Production has no implicit policy: set `BOOKING_MANAGEMENT_POLICY`
to hotel-confirmed JSON, for example:

```dotenv
BOOKING_MANAGEMENT_POLICY={"version":"hotel-policy-v1","checkInTime":"14:00","modificationSettlement":"MANUAL_REVIEW","cancellationRefund":"FULL_MANUAL_REVIEW"}
```

- The request must arrive **more than 24 hours** before the original check-in
  instant. At the exact cutoff, it is rejected. A Friday 14:00 arrival has a
  Thursday 14:00 cutoff in Sri Lanka. Proposed arrival must also be outside its
  own cutoff, so changing dates cannot bypass the rule.
- Only `CONFIRMED`, `WEBSITE`, LKR bookings are eligible. Pending checkout
  cancellation continues through the existing payment API; checked-in/out and
  cancelled reservations cannot be modified through these APIs.
- `MANUAL_REVIEW` permits repricing at the current catalogue/pricing policy and
  records a balance or refund for staff to reconcile. `SAME_TOTAL_ONLY` can be
  configured to reject any change to the original total.
- `FULL_MANUAL_REVIEW` records the entire currently paid amount as awaiting
  refund when cancellation commits. The reservation is cancelled immediately,
  inventory is released, and no payment row is falsely marked refunded.
- **These APIs do not call a refund or additional-charge provider API.** Staff
  must process/reconcile the actual money movement using the existing hotel
  process. A pending refund is not evidence of money returned. Verified
  `REFUNDED` payment rows subsequently change reads to `REFUNDED`.
- Further mutations are blocked while a prior management operation has an
  outstanding balance/refund or the payment provider flags review. There is a
  maximum of 50 accepted operations per booking; staff handle longer histories.

## Endpoints

All requests require `Authorization: Bearer <guest-token>`. All responses use
`Cache-Control: no-store`. The backend takes guest identity only from the token.

| Method | Gateway path                     | Purpose                                                                                 |
| ------ | -------------------------------- | --------------------------------------------------------------------------------------- |
| GET    | `/hw/bookings/:id/management`    | Current booking/payment state, management revision and eligibility                      |
| POST   | `/hw/bookings/:id/change-quote`  | Preview proposed room/dates/guests and price; no inventory reservation or booking write |
| POST   | `/hw/bookings/:id/changes`       | Commit a signed change quote                                                            |
| POST   | `/hw/bookings/:id/cancellations` | Cancel the current revision                                                             |

### Read eligibility

`GET /hw/bookings/:id/management` returns current authoritative booking fields,
`paidAmount`, `balanceAmount`, `refundAmount`, `refundStatus`, `revision`,
`changeEmailStatus`, and `eligible`. Eligible responses include `cutoff`,
`timeZone`, `checkInTime`, `policyVersion`, and settlement/refund modes.
Ineligible responses include a readable `reason`. Missing production policy
returns `eligible: false`; mutations return 503 until configured.

### Preview and apply a change

```json
{
  "roomTypeId": "22222222-2222-4222-8222-222222222222",
  "checkInDate": "2099-12-12",
  "checkOutDate": "2099-12-14",
  "numberOfGuests": 2,
  "specialRequests": "Quiet room if available"
}
```

POST this body to `change-quote`. Dates, room capacity and a 1–90-night stay
are validated. Omitting `specialRequests` preserves existing text; an empty
string clears it. Guest identity, prices, status and refund fields cannot be
supplied by the client.

Review the returned total, balance/refund amount and `settlementMode` before
posting `{ "quoteToken": "<returned-token>" }` to `changes`, with a unique
`Idempotency-Key` header (8–128 letters, digits, hyphens or underscores).

Change quotes expire after 10 minutes. They bind the owner, booking, revision,
current booking/payment state, target stay, price and policy. Their signing
domain differs from new-booking quotes. Committing rechecks eligibility,
capacity and availability while honouring the quoted price. A changed booking
or management policy requires a new quote. Room/date changes release any old
physical-room assignment so front desk can assign a suitable room later.

### Cancel

POST `{ "revision": 0 }` to `cancellations`, using the revision returned by the
management read and a unique `Idempotency-Key`. A stale revision returns 409
without cancellation. A successful response resembles:

```json
{
  "bookingId": "11111111-1111-4111-8111-111111111111",
  "status": "CANCELLED",
  "paidAmount": 2000000,
  "balanceAmount": 0,
  "refundAmount": 2000000,
  "refundStatus": "PENDING",
  "revision": 1,
  "operation": {
    "id": "33333333-3333-4333-8333-333333333333",
    "kind": "CANCELLED",
    "at": "2099-12-01T12:00:00.000Z",
    "policyVersion": "hotel-policy-v1",
    "emailStatus": "SANDBOX"
  },
  "replayed": false
}
```

Money values are integer minor units. Responses additionally contain room ID,
dates, guests, special requests, total and currency. Keep the same request body
and idempotency key on a timeout retry. A committed replay returns current
booking state and the same operation ID without applying another mutation,
even if the quote expired or cutoff passed. Reusing a key with another payload
returns 409. A new cancellation key on an already cancelled reservation also
returns 409, avoiding another refund request/email event.

## Email, storage and consistency

Accepted operations and immutable email receipt data are written atomically in
`price_snapshot.management` with a monotonic revision and hashed request key.
The existing infra checkout metadata is required; no schema migration is added.

After the transaction commits, an email send is claimed durably for that
operation. Emails explain the updated/cancelled state and any balance or pending
refund, using the existing Brevo transport and `BOOKING_EMAIL_MODE` settings.
`SANDBOX` means validation with no delivered email; `ACCEPTED` means provider
acceptance rather than verified inbox delivery. Neither state is resent.
`FAILED` can retry after one minute by replaying the original mutation request.
`UNKNOWN` and `SENDING` need operator review and are not automatically reclaimed.
Email failure never reverses a saved modification/cancellation. There is no
background delivery or refund worker in this issue.

Inventory room types are locked in deterministic order before booking/payment
rows, matching reservation/settlement locking. Availability excludes the
original reservation; preview and commit both check it. Competing changes use
revision/state binding and row locks. Dashboard and payment-status reads return
updated dates, totals, balances and refund state. Internal operation records,
request hashes and receipts are stripped from public payment responses.

## Errors

| Status | Meaning                                                                                    |
| ------ | ------------------------------------------------------------------------------------------ |
| 400    | Invalid UUID, body, dates, token, request key or unknown client fields                     |
| 401    | Missing/invalid guest authentication                                                       |
| 404    | Booking does not exist or belongs to another guest (same response)                         |
| 409    | Cutoff, status, revision, quote expiry/staleness, availability, settlement or key conflict |
| 503    | Missing/invalid production policy, pricing/signing configuration or storage outage         |

## Verification

From `backend`:

```powershell
npm run build
npm run lint
npm run format:check
node node_modules/jest/bin/jest.js --runInBand --coverage
node node_modules/jest/bin/jest.js --config test/jest-integration.json --runInBand --runTestsByPath test/integration/booking-management.integration-spec.ts test/integration/guest-bookings.integration-spec.ts
```

Integration checks create connection-local temporary table copies, roll back
fixtures, and mock email HTTP. They never send real email or issue refunds.
The optional `booking-race` CI suite also races a confirmed date change against
a last-room reservation in its disposable localhost database. It requires the
existing `CI=true` and `BOOKING_RACE_TEST=true` setup; do not enable it against a
shared/live database.
