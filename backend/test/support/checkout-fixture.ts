import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { QueryRunner } from 'typeorm';

/** Apply the existing proposal only to an unmigrated temporary test copy. */
export async function ensureTemporaryCheckoutSchema(runner: QueryRunner) {
  const targets = (await runner.query(
    "SELECT relpersistence='t' AS temporary FROM pg_class WHERE oid=to_regclass('pg_temp.bookings')",
  )) as { temporary: boolean }[];
  if (!targets[0]?.temporary)
    throw new Error('A temporary bookings table is required.');
  const columns = (await runner.query(
    "SELECT count(*)::int AS count FROM pg_attribute WHERE attrelid='pg_temp.bookings'::regclass AND attname=ANY($1::text[]) AND NOT attisdropped",
    [
      [
        'hold_expires_at',
        'checkout_key',
        'checkout_request_hash',
        'price_snapshot',
        'currency',
      ],
    ],
  )) as { count: number }[];
  if (columns[0].count === 5) return;
  if (columns[0].count !== 0)
    throw new Error('The checkout fixture has a partial schema migration.');
  const sql = readFileSync(
    resolve(__dirname, '../../../documents/api/booking-storage-proposal.sql'),
    'utf8',
  )
    .replace('ALTER TABLE bookings', 'ALTER TABLE pg_temp.bookings')
    .replaceAll('ON bookings(', 'ON pg_temp.bookings(');
  await runner.query(sql);
}
