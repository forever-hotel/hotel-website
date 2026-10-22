# Checkout persistence proposal — supersedes the two-table design

The user approved using existing bookings/payment tables with small additions.
See [the current API contract](booking-reservation-api.md) and
[the replacement SQL proposal](booking-storage-proposal.sql).

Add only these nullable fields to bookings: hold_expires_at, checkout_key,
checkout_request_hash, price_snapshot and currency. Add unique guest/key and
unique guest/preview indexes plus a pending-expiry index. No new tables are needed.

Quotes are signed backend price previews with a ten-minute validity period.
Starting payment stores the old price and breakdown in bookings, under a short
inventory lock, with a twenty-minute hold. No confirmed booking is created before
verified payment. Frozen prices are not recalculated when catalogue rates change.
Retries use the existing booking's key/hash and snapshot, not another table.

The schema proposal is not a migration executed by this repository. Live Neon,
existing accounts/reservations and environment files have not been modified.
Infra must apply approved fields/indexes and agree the shared writer protocol
with Front Desk. If old two-table holds exist, plan migration before activation.

Applicable tax/service-charge policy still needs hotel confirmation; the app
requires explicit configuration and does not assume standard VAT applies to
this hotel or silently add charges to inclusive prices.