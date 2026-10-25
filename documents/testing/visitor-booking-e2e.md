# Visitor-to-booking browser journey (DDP-#31)

The existing production-frontend browser harness now includes the complete guest
journey, in addition to booking recovery, management and confirmation regressions.
It uses Chrome/Edge's DevTools protocol without introducing another browser
automation dependency.

## Run locally

From `hotel-website/frontend`, install locked dependencies if needed, then run:

```powershell
npm run build
npm run test:e2e
```

Chrome or Edge must be installed. The harness detects the usual Windows Chrome/
Edge and Linux Chrome/Chromium paths; set `CHROME_BIN` to an executable when
needed. Node 22.14+ in the Node 22 series is required by the project. You do not
need a running backend, gateway, database, PayHere account or Brevo credentials.
`npm run test:booking-ui` remains an alias for the same suite, so do not run both
commands merely to repeat identical checks.

Optional local evidence:

```powershell
$env:E2E_ARTIFACT_DIR = '.test-artifacts/e2e'
npm run test:e2e
```

Success writes `results.json` with scenario results. Failure also attempts to
write `failure.png`, `app.log` and `browser.log`. Diagnostic JSON includes fixture
request paths, never authorization headers, passwords or payment bodies. These
artifacts are generated output ignored by Git.

## What the guest journey verifies

1. Begin on Home, choose room, dates and guests, and submit the actual stay planner.
2. A sold-out search shows no matching rooms and creates no guest reservation.
3. After availability changes, select a room from Rooms and follow the protected
   booking redirect to sign-in. Follow **Create account** and submit the real
   registration form/server action.
4. Sign in through the real form/server action. Check that dates, room type and
   guest selection survive the registration/login return path. The session is
   an HttpOnly cookie; no auth token or booking data enters browser storage.
   The independent earlier acceptance scenarios still use injected fixture
   sessions; this new journey does not.
5. Configure the selected stay, request its authoritative quote, confirm the
   account email, review payment, fill billing and submit checkout.
6. A failed/cancelled fixture payment cannot show confirmation, including when
   the browser return URL contains a forged `status=success` value. The failed
   reservation appears as Cancelled rather than Confirmed in Profile.
7. Book a second stay and move its fixture provider state from Pending to paid.
   Only the refreshed authoritative payment response enables confirmation.
8. Find the same confirmed reference, dates and total in My Bookings, open its
   details, and verify that the failed attempt is absent from Upcoming.

The same suite also checks five progress milestones across the supplied four
booking screens, back/refresh behavior, quote expiry and repricing, unpaid
checkout recovery, verified cancellation, print view, Profile ownership/error
states, management review/back-out/focus, cutoff rejection and idempotent retry.
Inputs wait for React hydration before dispatching edits. DevTools commands and
readiness waits are bounded to fail instead of leaving CI waiting indefinitely.

## Fixture boundaries and named gaps

This is a browser E2E test of the production frontend against an in-memory fixture
gateway. Registration, authentication, availability, reservations and payment
outcomes in that gateway are deterministic test data. The harness starts its
own frontend with `API_GATEWAY_URL` pointing to that local gateway, creates a
dedicated temporary browser profile, and cleans up its own processes/profile.
It does not touch real guest accounts or the configured hotel database.

New checkout uses the project's PayHere flow, superseding the backlog's historical
Stripe wording. Provider payment outcomes are simulated: the test does not visit
PayHere's hosted page, submit test card details, deliver external callbacks,
send real email or issue refunds. The real Nest/PostgreSQL/payment-signature/
email boundaries are covered separately by [DDP-#30 contracts](booking-contracts.md).
A staging/live sandbox integration check remains needed for the hosted provider
and public callback tunnel.

Offers browsing and honest unsupported-code feedback remain in the existing
acceptance scenarios. Applying a promo discount to a booking is an unsupported
backend contract, so the test does not fabricate a discounted success or claim
that part of AC3 is implemented. Unsupported add-ons, loyalty and PDF delivery
also remain outside this issue. Concurrency and 300-user performance testing
belong to the database race suite and DDP-#34, respectively.

## CI

The `Visitor-to-booking browser journey` job in Frontend CI installs dependencies,
builds the app, discovers an available Chrome/Chromium executable, and runs
`npm run test:e2e`. It has a ten-minute job limit and uploads the
`visitor-booking-browser-results` artifact even after failure when files exist.
Chrome's `--no-sandbox` flag is used only for the disposable CI browser process.
Local runs retain the browser's normal sandbox configuration.

Local passing results demonstrate the fixture-based browser workflow; actual
GitHub CI execution, reviewer approval and staging provider verification must
be recorded independently.
