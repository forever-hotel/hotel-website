# Offers implementation and remaining contracts — DDP-#24

## Implemented

`/offers` has a hotel-photo hero, code guidance strip, percentage/fixed discount
filters, active-code cards, empty/error states, newsletter-unavailable notice
and shared navigation/footer. Home and Offers use the same loader and card.
All validity display uses Asia/Colombo; active filtering uses `[from, until)`.
Fixed values are LKR cents. Only the supported P1 fields reach the client.

The code form checks syntax only (uppercase letters/digits/hyphens/underscores,
1–50 characters). It explicitly says the code has not been validated or applied
and links to room selection and hotel contact. It does not reduce a quote,
reserve inventory, redeem a code or claim newsletter success.

No category, featured flag, promotional title, offer photograph, package terms,
inclusions or marketing claims are invented. Percentage/fixed filters reflect
existing `discountType`, not unapproved marketing categories. The hero is general
hotel photography and does not claim to illustrate a particular promotion.

## Not complete: authoritative application

DDP-#24 cannot yet satisfy the valid-code/discounted-quote acceptance criterion.
The implemented `CreateBookingQuoteDto` rejects `promoCode`; it is not the
illustrative Q1 contract in `hotel-website-contracts.md`. That document still
contains draft contracts, not working promotion validation/redemption APIs.

Per the user's interim direction, Home/Offers now use
`GET /hw/promotions?limit=20`. The existing `/hw` gateway route forwards this to
the new backend `GET /promotions` endpoint. It reads `mad_promotion_codes` and
`mad_promotion_room_types` directly; no Manager API is required for the listing.
Only ACTIVE, currently valid, non-exhausted codes are returned, ordered by expiry
and ID. The backend uses database time and no-store responses. `limit` is 1–100
(default 20); this bounded listing has no cursor pagination. FIXED_AMOUNT maps
to the public FIXED type; percentage values and fixed LKR cents are unchanged.
Counters, status and administrative timestamps are not exposed. The adapter is
SELECT-only and does not increment redemptions or modify Manager records.

The schema has no separate publication flag: ACTIVE is the interim public-list
criterion under the user's instruction. Manager ownership of lifecycle and
future publication/marketing contracts remains unchanged. DB read permissions
are required; database failures render the unavailable state. No test fixtures
are used as live data and no environment or gateway settings were changed.

## Questions/contracts for Manager Dashboard and pricing owners

1. Agree the future Manager public route and published response, including
   publication/deactivation, pagination, validity boundaries and exhausted codes.
   Confirm whether marketing fields (title, description, approved image,
   category, featured flag, inclusions and terms) are available and approved.
2. Supply the authoritative stay-eligibility/discount API: code, room type,
   dates, nights, guest count, quantity and currency; stable invalid, expired,
   inactive, exhausted and ineligible errors. Never infer eligibility solely
   from public code listings or `roomTypeIds`.
3. Agree discount basis (nightly/whole stay), percentage precision/rounding,
   fixed-discount caps, zero-total policy and tax/service-charge ordering. The
   booking backend must return the authoritative discounted line items and total.
4. Agree atomic capped-code redemption at checkout: reserve/commit/release,
   idempotency, expiry and payment-failure recovery. A preview must not consume
   redemptions. All checkout retries must return the same result. Decide how
   code deactivation/exhaustion interacts with the approved frozen-price policy.
5. Preserve successful applied-code details and discount breakdown in the signed
   quote and booking price snapshot; use existing `promo_id` only for an actual
   validated promotion. A changed stay must obtain a newly validated quote.
6. Supply a newsletter provider/consent/unsubscribe contract if newsletter
   collection is wanted. Until then no email input or Subscribe action is enabled.

After these decisions, add backend promo validation and authoritative pricing,
extend the quote contract/parser, then enable Apply/Remove in the booking flow.
Do not silently strip invalid codes or submit browser-calculated discounts.

## Acceptance evidence

- Backend build/lint and 267 unit/HTTP tests passed. Two PostgreSQL integration
  tests verified active/valid/non-exhausted filtering, fixed-value/room-scope
  mapping, bounded listing and unchanged redemption counters. These used
  temporary table copies with rollback, not live promotion records.
- Build (including TypeScript), lint and all 32 frontend tests passed.
- The 31-test coverage run passed; promotion loader and Offers helper modules
  have 100% line/branch/function coverage. This does not represent UI coverage.
- Isolated Chrome checks pass for percentage/fixed filters, invalid-code feedback,
  explicit unvalidated-code guidance, unavailable newsletter, empty/failed feed
  and no horizontal overflow at 375px. They also exercise the existing booking
  flow to check that the new public Offers work does not create holds.
- Rendered HTTP smoke checks prove Home/Offers show the same active codes and
  exclude expired/future entries; failed feeds preserve usable pages.
- Actual valid/expired/inactive/exhausted/ineligible code _application_, discounted
  quote consistency and redemption concurrency remain blocked on the contracts
  above. The UI never claims these tests or integrations are complete.

Run from `frontend`:

```powershell
npm run lint
npm run build
npm test
npm run test:coverage
npm run test:booking-ui
```

The browser script uses an isolated fixture gateway, temporary browser profile
and its own frontend port. It never uses Neon or a real guest/promotion service.

Manual check: start backend, gateway and frontend, open `/offers`, try both
filters and enter a code. Existing ACTIVE/valid/non-exhausted database codes
should match Home. With no eligible rows, expect the empty state; with a failed
database query, expect unavailable. Code entry must never claim a discount has
been applied. No branch, database, schema or environment changes are needed.
