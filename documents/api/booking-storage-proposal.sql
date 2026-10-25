-- REPLACEMENT PROPOSAL FOR INFRA REVIEW ONLY. Never applied automatically.
-- Keep existing bookings/payments; add checkout metadata to bookings.
ALTER TABLE bookings
  ADD COLUMN hold_expires_at timestamptz,
  ADD COLUMN checkout_key varchar(128),
  ADD COLUMN checkout_request_hash varchar(64),
  ADD COLUMN price_snapshot jsonb,
  ADD COLUMN currency varchar(3),
  ADD CONSTRAINT bookings_currency_format CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT bookings_checkout_key_length CHECK (checkout_key IS NULL OR length(checkout_key) BETWEEN 8 AND 128),
  ADD CONSTRAINT bookings_checkout_request_hash_format CHECK (checkout_request_hash IS NULL OR checkout_request_hash ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT bookings_price_snapshot_object CHECK (price_snapshot IS NULL OR jsonb_typeof(price_snapshot)='object'),
  ADD CONSTRAINT bookings_checkout_fields_complete CHECK (
    (checkout_key IS NULL AND checkout_request_hash IS NULL) OR
    (checkout_key IS NOT NULL AND checkout_request_hash IS NOT NULL AND guest_id IS NOT NULL
     AND hold_expires_at IS NOT NULL AND price_snapshot IS NOT NULL AND currency IS NOT NULL)
  );
CREATE UNIQUE INDEX bookings_guest_checkout_key_unique ON bookings(guest_id,checkout_key) WHERE checkout_key IS NOT NULL;
-- A signed price preview can start only one checkout, even with a different key.
CREATE UNIQUE INDEX bookings_guest_preview_unique ON bookings(guest_id,(price_snapshot->>'quoteId')) WHERE checkout_key IS NOT NULL;
CREATE INDEX bookings_pending_hold_expiry ON bookings(hold_expires_at) WHERE status='PENDING' AND hold_expires_at IS NOT NULL;
-- Existing rows remain valid with NULL metadata; do not infer expiry for old PENDING bookings.
-- If the earlier two-table proposal was applied, Infra must plan migration of
-- active holds before switching versions. This proposal does not drop old tables.