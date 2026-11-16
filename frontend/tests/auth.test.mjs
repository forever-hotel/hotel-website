import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  safeReturn,
  validateCredentials,
  registrationName,
  authError,
} from '../src/features/auth/validation.ts';

test('return navigation preserves safe stay selections and rejects external destinations', () => {
  const stay =
    '/rooms?roomTypeId=abc&checkInDate=2026-12-10&checkOutDate=2026-12-12&numberOfGuests=2';
  assert.equal(safeReturn(stay), stay);
  for (const value of [
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    '/sign-in',
    '/rooms\n',
    '/%2f%2fevil.example',
    ['rooms'],
    undefined,
  ])
    assert.equal(safeReturn(value), '/profile');
});

test('registration names map to the actual fullName field', () => {
  assert.equal(registrationName(' Nimali ', ' Perera '), 'Nimali Perera');
  assert.equal(registrationName('Élodie', 'O’Connor'), 'Élodie O’Connor');
  assert.equal(registrationName('', 'Perera'), null);
  assert.equal(registrationName('Nimali', '123'), null);
  assert.equal(registrationName('A'.repeat(255), 'B'), null);
});

test('password validation matches registration minimum and bcrypt byte limit', () => {
  assert.equal(
    validateCredentials('guest@example.com', 'password123', true),
    undefined,
  );
  assert.ok(validateCredentials('bad', 'password123', true));
  assert.ok(validateCredentials('guest@example.com', 'short', true));
  assert.equal(validateCredentials('guest@example.com', 'short'), undefined);
  assert.ok(validateCredentials('guest@example.com', 'é'.repeat(37), true));
  assert.ok(validateCredentials('guest@example.com', ''));
});

test('authentication feedback distinguishes credentials, duplicates, rate limits and outages', () => {
  assert.match(authError(401), /incorrect/);
  assert.match(authError(409), /already exists/);
  assert.match(authError(400), /check your details/);
  assert.match(authError(429), /Too many/);
  assert.match(authError(503), /unavailable/);
});
