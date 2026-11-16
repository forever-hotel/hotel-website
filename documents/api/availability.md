# Room availability (DDP-#17)

Public, read-only endpoints. Gateway requests use `/hw`; the gateway strips
that prefix before forwarding to the NestJS backend. No environment changes
or schema migrations are required.

- `GET /hw/availability?roomTypeId=<uuid>&checkInDate=2026-12-10&checkOutDate=2026-12-12&numberOfGuests=2`
- `GET /hw/room-types/<uuid>/availability-calendar?from=2026-12-10&to=2026-12-12`

The stay response includes `roomTypeId`, `checkInDate`, `checkOutDate`,
`numberOfGuests`, `availableCount` and an ISO `checkedAt` timestamp.
The calendar response includes `roomTypeId`, `checkedAt` and `days`, each with
`date`, `availableCount` and `status` (`AVAILABLE` or `BLOCKED`).

Dates are strict YYYY-MM-DD hotel-local calendar dates in Asia/Colombo.
Checkout and calendar `to` are exclusive. UTC arithmetic advances date labels
without converting them to instants. Ranges must be 1–90 nights. Unknown query
fields are rejected. Guests must be a positive integer within room capacity;
children and multi-room quantities are not separate supported inputs.

Inventory reads the shared infra-owned `room_types`, `rooms` and `bookings`
tables in one PostgreSQL REPEATABLE READ transaction. Maintenance and unknown
room statuses are excluded. VACANT, OCCUPIED and REQUIRES_CLEANING rooms count
as physical inventory, matching the existing RoomRepository policy; overlapping
PENDING, CONFIRMED and CHECKED_IN bookings consume it. CANCELLED and CHECKED_OUT
bookings do not. Pending bookings have no expiry in this schema and remain
blocking until their owner changes their status.

For a stay, exclude any physical room with an overlapping assigned booking,
then subtract every overlapping unassigned booking, clamping the result to zero.
This conservative rule may understate capacity when unassigned bookings do not
overlap each other. Daily calendar counts use the same rule for each night.
Daily capacity does not guarantee a continuous stay in one room.

Errors: `400 VALIDATION_FAILED` for malformed input/ranges;
`400 CAPACITY_EXCEEDED` for occupancy above room capacity;
`404 ROOM_TYPE_NOT_FOUND`; `503 INVENTORY_UNAVAILABLE` when inventory cannot
be read. An outage never returns a successful available count.

These policies implement the existing shared schema; Front Desk/Infra owner
sign-off on maintenance scheduling, cleaning/occupied state semantics, pending
hold expiry and unassigned room allocation remains required. No approval is
claimed. Additional scheduled blocks have no table in the supplied schema.
This API is advisory: booking creation must recheck and reserve inventory
atomically across all writers. It creates no booking or reservation lock.

Verification (from `backend`):

```powershell
npx.cmd jest --runInBand --testPathPatterns=availability
npx.cmd jest --config test/jest-integration.json --runInBand --testPathPatterns=availability
```

The PostgreSQL test requires the normal development schema, uses temporary table
copies on its own connection and never writes real inventory. Frontend date
controls and booking-step wiring remain separate follow-up work.
