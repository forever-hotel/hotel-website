# Hotel website: database decisions

Status: **Agreed by the website team on 2026-10-11.** Items marked *Needs agreement* still need the named team to confirm.

This note explains how the hotel website uses the shared database described in `forever_hotel_corrected_full_schema.sql` (owned by `forever-hotel/infra`). It goes together with the [API contracts](../api/hotel-website-contracts.md).

## 1. Who creates the tables

- The **infra repo (`forever-hotel/infra`) creates and changes all tables** with migrations.
- The **website backend does not create or change tables.** It only reads and writes data in tables that already exist.
- Every environment of the website backend must use `DB_SYNCHRONIZE=false`. With `true`, TypeORM would try to change the shared tables to match the website's code.
- If the website needs a new column or table, we ask the infra owner for a migration (see section 5).

## 2. Guest accounts

- **Decision:** the website creates guest accounts (registration, HW-06).
- The website backend **writes** to the `guests` table. Other services only read it.
- Emails are saved in lowercase, so `Guest@x.com` and `guest@x.com` are the same person.

## 3. Room types

- **Decision:** room types rarely change, so they are a **fixed list**. There is no screen to add or edit them for now.
- The list is stored in the `room_types`, `room_type_images` and `room_type_amenities` tables, and is **added once by the infra team as seed data** (a migration that inserts the rows).
- The website **only reads** these tables. Bookings and promotions keep pointing to the same `room_type_id` values.
- To change a room type later (for example a new price), the infra team adds a new small migration. Do not copy the list into the website's code.
- **Needed from the hotel:** for each room type, its name, price per night (LKR), maximum guests, amenities and images; and the room numbers that belong to it.

## 4. Stopping the same room being booked twice

### The problem

Bookings are for a room **type** (for example "Deluxe"). The exact room number is chosen at check-in. If two guests book the last Deluxe room at the same moment, both requests can see "1 room free" before either one saves. Checking first and saving afterwards is not enough.

### Decision: lock, then check, then save (one at a time per room type)

Every booking for a room type happens inside one database transaction:

1. **Start** a transaction.
2. **Lock** the room type, so other bookings for the same room type wait their turn.
3. **Count** rooms of that type that are not under maintenance, then subtract the bookings that overlap the requested dates.
4. **Save** the booking if a room is free. Otherwise stop and return `409 ROOM_UNAVAILABLE`.
5. **Finish** the transaction. The lock is released automatically.

The lock uses a PostgreSQL **advisory lock** (a named lock that does not need write access to `room_types`):

```sql
BEGIN;

-- Wait until no one else is booking this room type.
SELECT pg_advisory_xact_lock(hashtextextended('booking:' || $1::text, 0));

-- How many rooms of this type can be booked?
SELECT COUNT(*) FROM rooms
WHERE room_type_id = $1 AND status <> 'UNDER_MAINTENANCE';

-- How many bookings already overlap these dates?
-- (check-in is inclusive, check-out is exclusive)
SELECT COUNT(*) FROM bookings
WHERE room_type_id = $1
  AND status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
  AND check_in_date < $3      -- requested check-out
  AND check_out_date > $2     -- requested check-in
  AND (status <> 'PENDING' OR hold_expires_at > NOW());

-- If (rooms - overlapping bookings) > 0, insert the booking; otherwise ROLLBACK and return 409.
INSERT INTO bookings (...) VALUES (...);

COMMIT;
```

`$1` is the room type ID, `$2` the check-in date and `$3` the check-out date. The lock is released at `COMMIT` or `ROLLBACK`.

### Rules every team must follow

- **Every service that creates or changes a booking must use the same lock key** (`'booking:' || room_type_id`): the website, Front Desk walk-ins, and Booking.lk imports. If one service skips it, double bookings can still happen. *Needs agreement: Front Desk team.*
- **Unpaid bookings on hold count as taken** until `hold_expires_at` passes, so no one can book a room another guest is paying for.
- Keep the transaction short: no emails, payment calls or other slow work while holding the lock.
- Changing dates or room type (HW-14) follows the same steps before the booking is updated.

### Known limit

`rooms.status = 'UNDER_MAINTENANCE'` describes the room **today**, not future dates. A room fixed by next week is still counted as unavailable. If the hotel needs maintenance planned by date, that needs a new table later.

### Options we did not choose

| Option | Why not now |
| --- | --- |
| A counter table per room type per night | Faster, but needs a new table that must stay in sync on every booking and cancellation |
| Book an exact room number with a PostgreSQL rule against overlaps | Strongest guarantee, but the SRS says the room number is chosen at check-in |

## 5. Columns and tables to request from infra

The shared schema covers most of what the website needs. These are missing (from the [API contracts](../api/hotel-website-contracts.md) and the SRS):

| # | Request | Why |
| --- | --- | --- |
| 1 | `bookings.hold_expires_at` | A pending booking holds a room only while the guest pays (section 4) |
| 2 | `bookings.version` | Stops two changes to the same booking overwriting each other |
| 3 | `bookings.cancelled_at`, `cancellation_reason`, refund status | Cancelling bookings (HW-14) |
| 4 | `bookings.subtotal`, `discount_amount` | Keeps the price details even if a promotion is deleted later |
| 5 | `payments.payment_type` (FULL / ADVANCE) | Full payment or deposit (HW-11) |
| 6 | A table of processed Stripe event IDs | Stripe can send the same event twice; a booking must not be confirmed twice |
| 7 | `booking_quotes` table | The API returns a `quoteId` with a price and an expiry |
| 8 | Idempotency keys table | Repeated booking, payment or cancellation requests must not run twice |
| 9 | Lowercase email rule on `guests` | Stops duplicate accounts that differ only by letter case |
| 10 | `room_type_images.sort_order` and `alt_text` | Images in a fixed order, and alt text for accessibility (WCAG, HW-17) |
| 11 | Index on `bookings (room_type_id, check_in_date, check_out_date)` | Fast availability checks (section 4) |
| 12 | Seed data for room types and rooms | Section 3 |

Smaller points: `idx_guests_email` is not needed because `UNIQUE` already creates an index; `total_amount > 0` blocks a 100% discount; the schema uses payment status `COMPLETED` while the API contract uses `SUCCEEDED`, so pick one name.

## 6. Still to decide

| Question | Who decides |
| --- | --- |
| Who owns `bookings` and `payments`, and how Front Desk joins the booking lock | Website + Front Desk |
| Guest login lockout after failed attempts (OWASP A07): stored on `guests` or in the API Gateway | Website + Gateway/Auth |
| The real room type and room list | Hotel (client) |
