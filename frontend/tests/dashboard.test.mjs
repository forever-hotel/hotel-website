import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bookingNights,
  bookingPrice,
  bookingStatus,
  categoryParam,
  pageParam,
  parseBooking,
  parseBookingDetail,
  parseBookingList,
  stayDate,
} from '../src/features/bookings/dashboard.ts';

const booking = {
  bookingId: '11111111-1111-4111-8111-111111111111',
  roomType: 'Garden Suite',
  roomImage: null,
  checkInDate: '2099-12-10',
  checkOutDate: '2099-12-12',
  numberOfGuests: 2,
  status: 'CONFIRMED',
  holdExpired: false,
  category: 'upcoming',
  totalAmount: 2000000,
  currency: 'LKR',
};
const list = {
  items: [booking],
  counts: { upcoming: 1, past: 0, cancelled: 0, total: 1 },
  category: 'upcoming',
  page: 1,
  pageSize: 20,
};

test('booking parser returns only dashboard fields and supports unavailable catalogue/currency', () => {
  assert.deepEqual(
    parseBooking({ ...booking, checkoutKey: 'private', guestId: 'private' }),
    booking,
  );
  const legacy = parseBooking({ ...booking, roomType: null, currency: null });
  assert.equal(legacy.roomType, 'Room');
  assert.equal(bookingPrice(legacy), 'Price currency unavailable');
  assert.match(bookingPrice(booking), /20,000/);
});
test('malformed dates, monetary amounts, identities and statuses are rejected', () => {
  for (const change of [
    { bookingId: '../other' },
    { checkInDate: '2099-02-30' },
    { checkOutDate: '2099-12-09' },
    { totalAmount: -1 },
    { totalAmount: '100' },
    { currency: 'javascript:' },
    { status: 'PAID' },
    { holdExpired: 'false' },
    { numberOfGuests: 0 },
  ]) {
    assert.throws(() => parseBooking({ ...booking, ...change }));
  }
});
test('list verifies category, page, totals and duplicate records', () => {
  assert.deepEqual(parseBookingList(list, 'upcoming', 1), list);
  for (const change of [
    { page: 2 },
    { pageSize: 100 },
    { counts: { ...list.counts, total: 2 } },
    { items: [booking, booking] },
    { items: [{ ...booking, category: 'past' }] },
  ]) {
    assert.throws(() =>
      parseBookingList({ ...list, ...change }, 'upcoming', 1),
    );
  }
});
test('detail verifies requested identity and handles special requests as text', () => {
  const detail = { ...booking, specialRequests: '<script>untrusted</script>' };
  assert.deepEqual(parseBookingDetail(detail, booking.bookingId), detail);
  assert.throws(() =>
    parseBookingDetail(detail, '22222222-2222-4222-8222-222222222222'),
  );
  assert.throws(() =>
    parseBookingDetail({ ...detail, specialRequests: {} }, booking.bookingId),
  );
});
test('query normalization bounds pagination and defaults unknown categories', () => {
  assert.equal(categoryParam('cancelled'), 'cancelled');
  assert.equal(categoryParam(['past']), 'upcoming');
  assert.equal(pageParam('2'), 2);
  for (const value of ['-1', '0', '1.5', '1000001', ['2'], undefined])
    assert.equal(pageParam(value), 1);
});
test('display uses actual status and date-only stay length', () => {
  assert.equal(bookingStatus(booking), 'Confirmed');
  assert.equal(
    bookingStatus({ ...booking, status: 'PENDING', holdExpired: true }),
    'Expired',
  );
  assert.equal(bookingNights(booking), 2);
  assert.equal(stayDate('2099-12-10'), '10 Dec 2099');
});
