# Guest booking management UI (DDP-#29)

The Profile dashboard links confirmed upcoming bookings to their management
options at `/profile/bookings/:bookingId#manage-booking`. Payment confirmation
links to the same page. These navigation links let the guest check their options;
the detail page displays actionable controls only after the backend confirms
eligibility through the [management API](booking-management.md).

## Guest flow

1. Sign in, open `/profile`, and choose **View details** or **Change or cancel**.
2. The detail page loads current payment/refund amounts and the hotel's cutoff
   in Sri Lanka time. Ineligible bookings show the server's reason. A failed
   management read has a refresh action and does not imply eligibility.
3. **Change booking** opens a labelled native dialog with room, dates, guests
   and special requests. Room choices come from the catalogue; their current
   advertised rates are not treated as a booking quote. Catalogue failure
   disables the change control while leaving eligible cancellation available.
4. **Preview changes** asks the backend for availability and authoritative price.
   Review shows the selected stay, old/new total, paid amount, expiry and any
   additional payment or refund for staff review. The guest can edit or close
   without changing their reservation. **Confirm booking change** saves it.
5. **Cancel booking** opens a separate review with stay dates, the current full
   refund policy's zero cancellation fee, and the paid amount awaiting staff
   refund processing. **Keep booking** backs out without a request. **Confirm
   cancellation** sends the current management revision.
6. Verified success refreshes the booking details, Profile data and payment
   confirmation. Messages distinguish a saved operation from email acceptance,
   sandbox validation and an unverified email attempt. Pending refunds are
   labelled as awaiting staff processing; no automated money movement is claimed.

## Interaction and recovery

No modification-dialog screenshot was supplied. The adaptation uses the existing
cream/gold/blue visual language, native modal focus trapping, labelled fields,
an explicit review step, and a mobile layout. Opening a change form focuses the
room selector; preview focuses its review heading. Closing/backing out returns
focus to the originating control. Cancellation initially focuses **Keep booking**.
Errors receive focus and use `role="alert"`; success uses `role="status"`.

The UI treats backend eligibility as authoritative. The backend still checks
ownership, cutoff, availability and revision on every mutation. A server conflict
leaves the actual booking unchanged, refreshes current data, and invalidates an
old price preview. Form selections remain available for correction.

Mutation buttons use an immediate submission guard plus pending state to prevent
double clicks. Each attempt gets one idempotency key. Network errors, 5xx and
malformed success responses are treated as an unverified result because saving
may already have committed. While uncertain, editing/back-out is blocked and
**Retry same request** reuses the exact key, signed token or cancellation revision.
It never silently creates a new attempt. Reloading discards local form state
and fetches current authoritative booking details; it does not resubmit a write.

All gateway credentials remain on the server, obtained from the existing HttpOnly
guest cookie inside every server action. Browser input is validated and mapped
to supported fields, and backend response identity, totals and operation receipts
are validated before claiming success. No quote, form data, token or booking
record is written to browser storage. Expired-session errors link to sign-in
with a local booking return URL.

## Verification

From `frontend`:

```powershell
npm run typecheck
npm run lint
npm run build
npm test
npm run test:coverage
npm run test:booking-ui
```

Browser checks require Chrome/Edge or `CHROME_BIN`. The existing harness uses
an isolated fixture gateway and never changes live bookings, sends email or
processes refunds. It covers navigation from both booking views, review/back-out,
focus, mobile overflow, repricing, duplicate clicks, refreshed dates/totals,
cutoff rejection, session expiry and replay after a committed cancellation's
response is lost. Node tests cover response validation and server-to-gateway
payload/credential/idempotency forwarding.

For manual testing, start the backend, gateway and frontend. Use a confirmed
website booking outside the cutoff; the development policy assumes a provisional
14:00 Sri Lanka check-in. Try changing dates without saving, then preview and save
a change. Use another eligible booking to test cancellation/back-out. Review
the new dates/status in Profile and payment confirmation. Outstanding price
differences block further changes until staff reconcile them. Email sandbox
mode intentionally does not deliver to an inbox. Production still requires the
hotel-confirmed policy described in the backend API contract.
