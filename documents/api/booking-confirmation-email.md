# Booking confirmation email — GitHub #179 / DDP-#26

After verified payment settlement commits, confirmation email is attempted only
for a CONFIRMED booking with a COMPLETED payment and no refund requirement.
The receipt uses database reference, room type, stay dates, currency, total,
completed paid amount and remaining balance. No sample contacts or unapproved
pre-arrival instructions are included. Email failure never undoes payment.

## Configuration

Set manually in the backend environment (never commit real credentials):

```dotenv
BOOKING_EMAIL_MODE=sandbox
BREVO_API_KEY=replace-with-your-key
BOOKING_EMAIL_FROM=verified-sender@example.com
```

The default mode is `off`. `send` is allowed only when NODE_ENV=production;
outside production use `sandbox` or mocks. Reuse the existing `BREVO_API_KEY`.
`BOOKING_EMAIL_FROM` overrides the existing `CONTACT_EMAIL_FROM` sender;
if omitted, the contact sender is used. Sender verification and transactional
email permissions belong to the Brevo account owner.

Brevo receives `POST https://api.brevo.com/v3/smtp/email` with an `api-key`
HTTP header and `sender`, `to`, `subject`, `textContent` fields. Sandbox adds
`headers: { "X-Sib-Sandbox": "drop" }` inside the JSON payload. Both modes
require HTTP 201 with a nonempty string `messageId`; malformed successes remain
UNKNOWN. Sandbox sends no email; acceptance does not prove inbox delivery.
See [Brevo sandbox documentation](https://developers.brevo.com/docs/using-sandbox-mode).

The user selected Brevo for #179, superseding the original draft's provider
choice. Payment, persistence and guest ownership contracts are unchanged.

## Persistence, retries and limits

`bookings.price_snapshot.confirmationEmail` stores state and attemptedAt;
no tables or columns are added. An atomic conditional UPDATE claims a send
before provider IO, so repeated/concurrent callbacks and status refreshes
cannot send twice. The payment metadata and pricing fields are preserved.

The owned payment status response adds `emailStatus`: NOT_REQUESTED, SENDING,
SANDBOX, ACCEPTED, FAILED or UNKNOWN. Internal email metadata is omitted from
the public price snapshot. The confirmation view explains each state without
claiming delivery. Existing guest authorization remains required.

Missing/disabled configuration or an explicit HTTP 4xx rejection is FAILED.
After correcting configuration/provider rejection, a payment event replay or
an owned payment status refresh retries after a one-minute cooldown. There is
no background worker: operators must monitor `booking_email_retry_required`
and `booking_email_review_required` logs. Logs contain booking ID and state,
never recipient addresses, keys or raw provider errors.

Transport errors, unexpected responses and 5xx are UNKNOWN because provider
acceptance may have occurred. A crash after claiming can leave SENDING. These
states are never automatically reclaimed: an operator must check provider
activity before an approved reset to FAILED. A successful provider call followed
by a database error also stays SENDING. This avoids automatic duplicates, but
does not promise exactly-once delivery across an external provider boundary.
Delivery webhooks, automated recovery workers and provider-side deduplication
remain named follow-ups. SANDBOX/ACCEPTED are terminal and are not resent when
switching modes.

## Verification

From backend: `npm test -- --runInBand` and `npm run test:cov -- --runInBand`.
PostgreSQL: `npm run test:integration -- --testPathPatterns=stripe-checkout`
against a disposable database with the team schema. The persistence tests
check single send across settlement replay, content/status agreement, ownership,
provider rejection, cooldown retry and suppression of ambiguous attempts.
Frontend: `npm test` checks honest email state messages.

For a manual sandbox check, configure the values above, restart the backend,
complete Stripe test checkout and refresh the owned confirmation view. Expect
SANDBOX and no delivered email. Replay the payment event: no second request.
An invalid key should produce FAILED without changing CONFIRMED/paid amount;
fix the key and refresh after one minute to retry. Do not mark delivery verified
from a sandbox result or provider acceptance alone.

## Local evidence

Verified on 23 October 2026: 315 backend unit tests, 51 PostgreSQL integration
tests (including concurrent email claims), and 37 frontend tests passed.
Backend unit coverage exceeds the configured 80% thresholds. The new email service
has 100% line coverage; the repository has 100% lines and 83.33% branches
under the PostgreSQL suite. Both application builds and lint checks passed;
backend formatting and frontend typecheck passed. Tests mocked Brevo;
no real mail was sent and no real environment file was changed.

The database run used isolated local PostgreSQL 18 and the checked-in infra
schema; CI still uses PostgreSQL 16 and must pass before merge. A supplemental
backend `tsc --noEmit` check reports existing contact/Stripe test-fixture typing
errors; the configured backend build, Jest and lint checks pass.
