# Hotel website booking load (DDP-#34)

This dependency-free Node runner measures the deployed website and gateway. It
supports up to 300 concurrent virtual guests, timed ramp-up, think time, JSON
results and explicit team-approved response-time/error-rate thresholds.

**The 300-user staging acceptance run is pending.** No staging URL, infrastructure
allocation or agreed numeric NFR-14 targets were supplied. The example deliberately
contains no invented passing targets. Local runner tests prove the harness works;
they do not establish system capacity.

## Local verification

Requires Node 22.14 or newer. No `npm install` is needed:

```powershell
cd D:\hotel-project\hotel-website\performance
npm test
npm run test:coverage
```

The tests start disposable local HTTP servers with synthetic responses. They
check metrics/thresholds, the mixed traffic flow, image bytes, contention,
cleanup, secret-free reporting, and failure detection for overbooking, failed
images and failed cleanup. CI runs them without contacting staging.

Local verification on 2026-10-25: all 8 harness tests passed, with 94.34% line
and 90.30% branch coverage in the runner (metrics module: 100%). Backend build,
lint and formatting passed. The updated PostgreSQL race test was not executed
locally because the disposable Docker database was unavailable; integration CI
remains its execution environment.

The backend's existing `booking-race.integration-spec.ts` independently checks
real PostgreSQL transactions using multiple pooled connections. Its last-room
test now uses two distinct guests. Backend integration CI enables it with
`BOOKING_RACE_TEST=true` against a disposable localhost database. It refuses a
shared/cloud database and requires `CI=true`. Do not set these flags to point
at your normal development database.

## Prepare the staging run

1. Coordinate the window and traffic split with infra. The SRS describes a
   **system-wide** 300-user test; 300 website virtual users alone cannot certify
   capacity across the other subsystems. Record the coordinated traffic in
   `metadata.systemWideTraffic`; set `users` to the agreed website share.
2. Copy `config.example.json` to `config.local.json`. Set actual website and
   gateway origins, deployed revision, CPU/RAM/replica/database resources,
   gateway/manager timeouts, inventory/guest/image dataset sizes and the approved
   NFR-14 source. Set `targets.p95Ms` and `targets.maxErrorRate` (fraction, e.g.
   0.01 means 1%). The example's null values are rejected.
3. Pre-create one distinct **test** guest account per virtual user. Put an array
   of `{ "email": "...", "password": "..." }` in `accounts.local.json`.
   Accounts and local configuration are ignored by Git. Login setup uses batches
   of ten and is recorded separately; it is not part of the ramped traffic.
4. Configure real room UUIDs, future dates and sufficient normal inventory for
   the mixed workload. Add a separate room/date range with **exactly one real
   available room** for `lastRoom`. It must not overlap the main workload.
   Do not seed public/shared database tables with sample inventory for this run.
5. Configure public HTML paths and matching original/Next optimized image pairs
   actually used by those pages. Cover multiple representative photos, widths
   and public pages. An example filename does not guarantee it exists on your
   deployment. Keep external Manager dependencies configured normally.
6. Start infra monitoring for frontend/backend/gateway/Manager CPU, memory,
   connection pools, lock waits, database queries and provider-independent
   timeout logs. Record monitoring timestamps and cold/warm image cache state.

Run from this directory:

```powershell
npm run load -- config.local.json results/staging-cold.json
# Repeat with the same deployment/dataset to compare a warm image cache.
npm run load -- config.local.json results/staging-warm.json
```

The workload creates unpaid reservations and immediately cancels normal ones
through the owned pending-booking API. The last-room winner is retained until
the contention assertion finishes and is cancelled during final cleanup. It
never starts provider checkout or sends payment callbacks. These are real
staging booking writes: use dedicated test accounts/inventory and retain the
result for cleanup review. This is not a live charge, paid booking or refund test.

## What the report means

Each guest repeatedly fetches a public page, original and optimized photos,
catalogue, promotions, availability/calendar, a quote and a refreshed quote.
Every `bookingEvery` cycles it reserves from the refreshed quote and cancels
the unpaid hold. Expected last-room conflicts are counted separately; ordinary
search/booking conflicts and 429/5xx responses count as errors.

During mixed traffic, two distinct guests obtain last-room quotes, then submit
reservations together. Passing requires exactly one successful reservation,
one `ROOM_UNAVAILABLE` conflict, zero remaining availability and a persisted
owned pending booking. An already-empty dataset, two winners, two failures or an
unverifiable response fails the check. This HTTP check complements the actual
SQL row-count assertion in backend concurrency CI.

The JSON includes p50/p95/p99/max full-response time, counts, status distribution,
error fraction, client timeouts, received payload bytes, image payload ratio,
observed throughput, load settings, generator hardware/memory and infra/dataset
metadata. Times include downloading the complete response. Bytes are received
decoded body bytes, **not** on-wire compressed transfer size. The image ratio is
an aggregate across configured pairs, not an assertion that every image shrank.
HTTP 502/504 are visible in status distributions; client deadline expiry is a
separate timeout counter. Compare those timestamps with gateway/Manager traces
to identify which upstream caused a delay.

Exit code 0 requires every operation to run and meet the configured p95/error
targets, a passing last-room check and complete acknowledged cleanup. Reports
contain no passwords, JWTs, quote tokens or raw response bodies. Ambiguous failed
reservation requests record only the idempotency key/quote ID for investigation.
Review `pendingBookingIds` and `uncertainReservations` after **every** run: a
timeout can leave a committed hold even when no success reached the client.
Do not retry it with a new key or claim cleanup without checking owned recovery
and booking state. A hard process termination cannot perform final cleanup.

This is closed-loop HTTP load: slow responses reduce request rate. It measures
virtual guests, not 300 requests per second or browser rendering time. A cycle
already started finishes after the configured duration, so total elapsed time
includes drain and cleanup. The Node generator stores latency samples in memory;
monitor its CPU/RAM and use a separate host so it does not become the bottleneck.
Each cycle compares one configured image pair; it does not discover every page
asset or simulate a browser cache. Fetching both originals and optimized images
adds comparison traffic. Agree that traffic mix with infra before interpreting
the run as a realistic user workload.
Existing browser quality tests provide screenshots, layout and accessibility
checks; use browser/network tooling for LCP and actual image transfer evidence.

## Acceptance evidence to attach

Attach cold/warm JSON reports, deployed commit, agreed target reference,
hardware and dataset inventory, monitoring snapshots, coordinated subsystem
traffic and a short bottleneck analysis. Record lock waits, rate limits,
gateway/Manager timeouts and image payload/cache behaviour even if the run fails.
Keep credentials and private local config out of PR artifacts.

| Check                                            | Current evidence                                              |
| ------------------------------------------------ | ------------------------------------------------------------- |
| Harness and failure detection                    | Automated disposable HTTP tests in `test/runner.test.mjs`     |
| Real last-room database protection               | Two-guest pooled-transaction test in backend integration CI   |
| Staging NFR-14 and 300-user system-wide capacity | Pending infra environment, agreed targets and coordinated run |
| Photo/calendar/quote refresh performance         | Implemented measurements; actual staging results pending      |
