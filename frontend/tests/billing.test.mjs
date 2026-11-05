import assert from 'node:assert/strict';
import { test } from 'node:test';
import { billingDefaults } from '../src/features/booking/billing.ts';

test('billing uses account details without inventing missing address or surname', () => {
  assert.deepEqual(
    billingDefaults({
      fullName: '  Nimali Kumari Perera ',
      email: 'guest@example.com',
      phone: '+94771234567',
    }),
    {
      firstName: 'Nimali Kumari',
      lastName: 'Perera',
      phone: '+94771234567',
      address: '',
      city: '',
      country: '',
    },
  );
  const singleName = billingDefaults({
    fullName: 'Nimali',
    email: 'guest@example.com',
  });
  assert.equal(singleName.firstName, 'Nimali');
  assert.equal(singleName.lastName, '');
  assert.equal(singleName.phone, '');
});
