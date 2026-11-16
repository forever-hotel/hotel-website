# Guest booking dashboard (DDP-#27)

The Profile page at `/profile` shows only the signed-in guest's reservations.
`/profile/bookings/:bookingId` shows owned reservation details. Both use the
existing HttpOnly guest session and make uncached server-side gateway requests.
The gateway's existing `/hw` route forwards these endpoints; no gateway change is needed.

## API

Every endpoint requires `Authorization: Bearer <guest-token>` and returns
`Cache-Control: no-store`. Identity comes exclusively from the verified JWT.
Supplying a `guestId` query parameter is rejected.

| Method | Gateway path                            | Result                                                                    |
| ------ | --------------------------------------- | ------------------------------------------------------------------------- |
| GET    | `/hw/bookings?category=upcoming&page=1` | A page of owned reservations and counts across the guest's entire history |
| GET    | `/hw/bookings/:bookingId`               | One owned reservation, including special requests                         |

`category` accepts `upcoming` (default), `past`, or `cancelled`. `page` is an
integer from 1 to 1,000,000 (default 1). Pages contain at most 20 records. A page
beyond the result set returns an empty `items` array with unchanged counts.
Unknown query fields and malformed booking UUIDs return 400.

List example:

```json
{
  "items": [
    {
      "bookingId": "11111111-1111-4111-8111-111111111111",
      "roomType": "Garden Suite",
      "roomImage": null,
      "checkInDate": "2099-12-10",
      "checkOutDate": "2099-12-12",
      "numberOfGuests": 2,
      "status": "CONFIRMED",
      "holdExpired": false,
      "category": "upcoming",
      "totalAmount": 2000000,
      "currency": "LKR"
    }
  ],
  "counts": { "total": 1, "upcoming": 1, "past": 0, "cancelled": 0 },
  "category": "upcoming",
  "page": 1,
  "pageSize": 20
}
```

Detail has the same record fields plus `specialRequests` (string or null).
Amounts are integer minor units. Nullable legacy currency is preserved; the UI
shows that the currency is unavailable instead of assuming LKR. Missing room
metadata or disallowed/broken photographs use readable fallbacks.

## Classification and privacy

- Cancelled: stored `CANCELLED` status, regardless of stay dates.
- Past: `CHECKED_OUT`, checkout date on/before the current hotel date in
  `Asia/Colombo`, or an expired website checkout hold.
- Upcoming: all remaining reservations, including stays currently checked in.
- An expired hold requires `PENDING`, `WEBSITE`, a checkout key, and a passed
  hold expiry. Old pending bookings without checkout metadata are not assumed
  expired. The UI labels expired holds “Expired”; these reads never change status.
- Upcoming stays sort by earliest check-in; other categories by latest check-in.
  UUID breaks ties. Counts and page data share a repeatable-read snapshot.
- Lists and details filter `bookings.guest_id` in SQL. Unowned and nonexistent
  detail IDs both return 404. Missing/invalid JWTs return 401; storage failures
  return 503 without SQL or connection details.
- Responses omit guest IDs, checkout keys/hashes, provider data and payment
  payloads. Room images pass the existing URL allowlist and special requests
  render as escaped text. No guest records or tokens enter browser storage.

## UI and scope

The dashboard includes guest identity, account navigation, sign-out, total and
upcoming counts, Upcoming/Past/Cancelled navigation, pagination, room thumbnails,
dates, guest/night counts, actual booking status, price, and detail links.
Loading, empty, out-of-range page, outage, missing detail and expired-session
states are distinct. Existing session deletion behavior handles sign-out.

The detail page links upcoming reservations to the existing booking/payment
status page. Modification/cancellation controls belong to DDP-#28/#29. Loyalty
and membership balances are omitted until an authoritative service exists.

Uses the existing infra tables and checkout metadata from
[booking storage](booking-storage-proposal.sql); no schema change is introduced.

## Verification

From `backend`: `npm run build`, `npm run lint`, `npm run format:check`, and
`node node_modules/jest/bin/jest.js --runInBand`.

The focused PostgreSQL check is
`node node_modules/jest/bin/jest.js --config test/jest-integration.json --runInBand --runTestsByPath test/integration/guest-bookings.integration-spec.ts`.
It uses connection-local temporary copies and rolls back every fixture. It
covers ownership, counts, pagination, expired holds and the hotel checkout-day boundary.

From `frontend`: `npm run build`, `npm test`, and `npm run test:booking-ui`
(Chrome/Edge or `CHROME_BIN` required). Browser checks use a local fixture gateway
and verify tabs/counts, pagination, details, escaped requests, unsafe image
fallback, empty/error/expired states, mobile overflow and sign-out.
