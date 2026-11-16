import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  validStay,
  monthDates,
  availabilityCount,
  hotelMonth,
} from '../src/features/rooms/availability.ts';

test('stay validation rejects invalid dates, ranges and occupancy', () => {
  assert.equal(validStay('2026-12-10', '2026-12-12', 2), true);
  assert.equal(validStay('2026-02-30', '2026-03-04', 2), false);
  assert.equal(validStay('2026-12-10', '2026-12-10', 2), false);
  assert.equal(validStay('2026-12-10', '2026-12-09', 2), false);
  assert.equal(validStay('2026-12-10', '2027-12-12', 2), false);
  assert.equal(validStay('2026-12-10', '2026-12-12', 0), false);
  assert.equal(validStay('2026-12-10', '2026-12-12', 1.5), false);
  assert.equal(validStay('', '', 2), false);
});

test('calendar month boundaries handle leap years and invalid months', () => {
  assert.equal(monthDates('2028-02').length, 29);
  assert.equal(monthDates('2026-02').length, 28);
  assert.deepEqual(monthDates('2026-13'), []);
  assert.deepEqual(monthDates('bad'), []);
  assert.equal(monthDates('2026-12').at(-1), '2026-12-31');
  assert.match(hotelMonth(), /^\d{4}-\d{2}$/);
});

test('untrusted availability data never becomes false availability', () => {
  assert.equal(availabilityCount({ availableCount: 0 }), 0);
  assert.equal(availabilityCount({ availableCount: 3 }), 3);
  for (const data of [
    null,
    {},
    [],
    { availableCount: -1 },
    { availableCount: '3' },
    { availableCount: 1.5 },
  ])
    assert.throws(() => availabilityCount(data));
});
