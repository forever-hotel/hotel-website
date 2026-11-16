import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toggleComparisonRoom } from '../src/features/rooms/comparison.ts';

test('room comparison supports two and three selections without duplicates', () => {
  const original = [];
  const one = toggleComparisonRoom(original, 'deluxe');
  const two = toggleComparisonRoom(one, 'suite');
  assert.deepEqual(two, ['deluxe', 'suite']);
  assert.deepEqual(toggleComparisonRoom(two, 'family'), [
    'deluxe',
    'suite',
    'family',
  ]);
  assert.deepEqual(original, []);
  assert.deepEqual(one, ['deluxe']);
});

test('a fourth room is blocked until an existing room is removed', () => {
  const three = ['deluxe', 'suite', 'family'];
  assert.deepEqual(toggleComparisonRoom(three, 'garden'), three);
  const removed = toggleComparisonRoom(three, 'suite');
  assert.deepEqual(removed, ['deluxe', 'family']);
  assert.deepEqual(toggleComparisonRoom(removed, 'garden'), [
    'deluxe',
    'family',
    'garden',
  ]);
  assert.deepEqual(three, ['deluxe', 'suite', 'family']);
});

test('removing selections returns to one and zero rooms', () => {
  const one = toggleComparisonRoom(['deluxe', 'suite'], 'suite');
  assert.deepEqual(one, ['deluxe']);
  assert.deepEqual(toggleComparisonRoom(one, 'deluxe'), []);
});
