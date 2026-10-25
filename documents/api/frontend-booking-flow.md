# Guided booking flow — GitHub #171 / DDP-#23

Update: GitHub #178 / DDP-#25 now implements the payment handoff's hosted Stripe
test checkout and final status screen. The descriptions below record the #23
screen boundary; see [the current payment flow](stripe-checkout.md) for payment
configuration, full-payment-only policy, 35-minute holds and verified confirmation.

`/booking` implements selection, room configuration and guest information, then
a payment handoff. It shares the existing room catalogue, search and calendar.
All five milestones are visible: Select Room, Room Details, Guest Info, Payment,
Confirmation. Only the first three screens and the pre-payment review are active.

## Contract and boundaries

- Guest authentication uses the existing HttpOnly `hw_guest_session` cookie.
  The server verifies `/hw/guests/me`; missing/expired sessions return to sign-in
  with safe stay parameters. JWTs never enter browser storage or URLs.
- The server action sends only room type, check-in, check-out and guest count to
  `POST /hw/booking-quotes`. It forwards the bearer token on the server and uses
  no-store requests. The returned identity, dates, prices and charge breakdown are
  validated before rendering. Prices are LKR cents, not browser estimates.
- Quotes belong to the current configuration. Applying different dates/occupancy
  or selecting another room requires a new quote. Unsaved edits invalidate the
  displayed quote and block continuation. Expired quotes require explicit refresh.
  Stale responses cannot move a guest who navigated to a different configuration.
- Only one room and the existing guest-count contract are supported. Multiple
  rooms, child-specific pricing, meal plans, promo codes and arrival options are
  excluded explicitly until their contracts exist (#24/#25).
- Name/email come from the authenticated guest account; an email confirmation
  and up to 300 characters of plain-text special requests are collected. Country,
  mobile, title and separate guest names are not sent as invented booking fields.
- The quote token and special requests remain in component memory for the later
  payment integration. Review passes the current quote identity and supported
  requests into the payment handoff; no provider call, card entry, booking POST,
  inventory hold or confirmation is performed by this issue. #25 must call the
  checkout API only when actual payment starts, using `quoteToken` and an
  idempotency key, and handle expiry/verified payment confirmation.

## Navigation and recovery

Room type, dates, guest count and step are recorded in the URL. Refresh and
back/forward preserve these safe selections. Guest email confirmation, requests
and quote tokens are not persisted to storage or the URL. In-page navigation
retains guest input; a full refresh requires a fresh quote and guest review.
Direct navigation to Payment cannot bypass review or create a reservation.

Errors appear in red with accessible alerts; field errors use `aria-invalid`
and descriptions. Availability failure is unknown inventory, never a fake
available room. Failed quotes keep selections and offer retry or sign-in.

## Automated verification

From `frontend`:

```powershell
npm run lint
npm run format:check
npm run typecheck
npm run build
npm test
npm run test:coverage
npm run test:booking-ui
```

The browser check requires an installed Chrome/Edge (or `CHROME_BIN`). Run it
after building. It starts its own frontend port, fixture gateway and temporary
browser profile. It never uses the real backend, Neon or a real guest account.
Model/client tests cover hotel dates, capacity, safe URL fields, guest validation,
authoritative quote parsing, errors and gateway forwarding without booking holds.
Coverage of these two new `.ts` modules is 100%; this is not React UI coverage.
Browser checks exercise real rendered components and server actions separately.

Verification on 23 October 2026: build (including TypeScript), lint, all 27
frontend tests and isolated browser checks passed. Browser coverage includes
selection, five milestones, double-click suppression, red field feedback,
back/forward, refresh recovery, stale quote/session/network errors, edited-date
invalidation, capacity rejection and no horizontal overflow at 375px. The
coverage command's 26 model/client tests passed. Formatting passes for all changed
files; repository-wide `format:check` still flags 37 unchanged existing files.

## Manual acceptance check with the development backend

1. Start backend (`npm run start:dev`), gateway (`npm run dev`) and frontend
   (`npm run dev`, port 3001). Existing API gateway/pricing settings are required.
2. Open `/rooms`, search future dates with actual inventory and select a room.
   If signed out, sign in and confirm the same stay is retained.
3. Select another room in Room Details, adjust dates/guest count, apply the
   change and choose **Check price and continue**. Confirm the sidebar uses the
   returned backend total and line items, not catalogue-only arithmetic.
4. Submit Guest Info without matching confirmation email: see a red field error.
   Enter the account email and optional requests, then review the payment handoff.
   Confirm it says no payment taken/no reservation and shows the quote identity.
5. Use Back/Forward, then refresh. Safe stay fields survive; a full refresh asks
   for a fresh quote and review rather than displaying a confirmed reservation.
6. Change dates while on Guest Info. The old total disappears and progression
   is blocked until the change is applied and a new quote is requested.
7. Test sold-out dates, expired quote, invalid occupancy, gateway outage and
   expired session. Each must block progression with a recovery message.
8. Confirm browsing, quote refresh and repeated Continue never insert a booking.

No environment files, live database, branch creation or payment processing are
part of this change. Real-service manual checks remain for the development setup.
