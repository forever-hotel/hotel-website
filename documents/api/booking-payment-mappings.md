# Booking and payment mappings (DDP-#21)

`BookingsModule` and `PaymentsModule` register TypeORM entities against the
infra-owned `bookings` and `payments` tables. There are no booking/payment HTTP
endpoints in this ticket. Reservation creation, quotes, provider processing and
booking screens remain subsequent tickets.

Both entities explicitly disable schema synchronization. No migrations, schema
updates, cascaded writes or automatic status transitions were added. Relations
are opt-in rather than eager and entities must not be used as public response
DTOs for later endpoints.

## Existing schema mapping

Booking maps its UUID, nullable guest ID (anonymous walk-ins), required room type,
nullable physical room assignment, nullable promotion ID, date-only check-in/out,
status, total amount, source, requests, guest count and timestamps. Relations point
to Guest, RoomType, Room and a read-only promotion identity reference. The latter
maps only `mad_promotion_codes.promo_id`; MAD continues to own all promotion data.

Booking statuses: PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED.
Booking sources: WEBSITE, WALK_IN, BOOKING_LK.

Payment maps its UUID, booking ID, payment method, amount, payment status,
nullable unique Stripe reference, nullable paid-at time and timestamps. A booking
has many payments; deleting a booking with payments is restricted by Infra's FK.
Payment methods: STRIPE, CASH, CARD_ON_SITE. Payment statuses: PENDING, COMPLETED,
REFUNDED, FAILED. Provider/card brand/payment type fields from logical designs
are not invented in the physical schema mapping.

Hotel dates remain YYYY-MM-DD strings; timestamps are Date values. Monetary
amounts are integer minor units using the existing LKR contract. The schema
has no currency column; multi-currency storage requires an Infra decision.
Foreign keys, positive amounts/counts, date order and enum validation are
enforced by the existing database, not schema synchronization.

## Booking-screen field traceability

| Screen field | Storage / decision |
| --- | --- |
| Selected room type | `bookings.room_type_id` |
| Physical room | `bookings.room_number`, nullable until assigned |
| Check-in / checkout | `check_in_date`, `check_out_date`; checkout exclusive |
| Number of nights | Derived from hotel date difference |
| Adult/guest count | `num_guests`, one aggregate count |
| Child count / ages | Unsupported separately; request Infra/contract decision |
| Room quantity / multiple types | No quantity or booking-items table; unsupported pending Infra |
| First / last names | Existing Guest.fullName via guest_id; no new booking name fields |
| Guest email / phone | Existing Guest fields; snapshot/change policy needs contract decision |
| Confirmation email | Form validation only; not a second stored email |
| Title / country of residence | No existing fields; unsupported pending owner decision |
| Arrival-time selection | No existing field; unsupported pending owner decision |
| Special requests | `special_requests`; validation belongs to the reservation API |
| Meal plan / add-ons | No existing storage/pricing contract; unsupported |
| Promotion selection | Nullable `promo_id`; MAD owns eligibility and values |
| Rate, discounts and tax line items | Derived authoritative quote; no stored breakdown columns |
| Booking total | `total_amount`; quote/payment logic must establish the value |
| Currency | Existing LKR contract; no persisted currency column |
| Reservation identity | `booking_id`; separate human reference is not mapped |
| Quote identity, expiry and idempotency | No existing fields; owner/Infra decision before #22 |
| Payment amount, state and paid time | `payments.amount`, `payment_status`, `paid_at` |
| Stripe provider reference | `stripe_ref`, nullable and unique when present |
| Deposit/full-payment classification | Not stored separately; owner decision required |
| Card number / CVV / raw card details | Never stored; future payment-provider hosted flow |
| Masked card brand / last four | Not in this schema; do not invent or collect raw card data |

These gaps are recorded, not resolved by local migrations. Coordinate shared
booking writes/status ownership with Front Desk and schema changes with Infra.

## Verification

From `backend`:

```powershell
npm.cmd run build
npm.cmd run lint
npx.cmd jest --config test/jest-integration.json --runInBand --testPathPatterns=booking-payment
npx.cmd jest --runInBand --coverage
```

The integration suite starts the normal application (synchronization disabled),
copies actual public table structures and their existing constraints into
connection-local temporary tables, performs ORM reads/writes, then rolls back.
It creates no real accounts, bookings or payments and never changes the public
schema. Negative cases check invalid guest/room/type/promotion/payment references,
dates, positive amounts/counts and status enums. Missing deployed booking/payment
constraints cause failures rather than being silently substituted.

Validation completed: all 212 unit tests and the 80% coverage gate passed
(91.82% lines, 85.17% branches overall), all 12 PostgreSQL mapping integration
cases passed, and build/lint passed. Live public schema and records were not
modified. Shared-owner sign-off, CI and peer approval remain release work.
