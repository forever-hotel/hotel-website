// Invoked by the backend HTTP integration suite with real, temporary-fixture responses.
// Do not replace these imports with duplicated response schemas.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseRoomCatalogue } from '../../src/features/rooms/catalogue.ts';
import { availabilityCount } from '../../src/features/rooms/availability.ts';
import { parseQuote } from '../../src/features/booking/booking.ts';
import {
  parsePayHereCheckout,
  parsePaymentStatus,
} from '../../src/features/booking/payment.ts';
import {
  parseBookingDetail,
  parseBookingList,
} from '../../src/features/bookings/dashboard.ts';
import {
  parseManagement,
  parseChangeQuote,
  parseMutation,
} from '../../src/features/bookings/management.ts';
import { activePromotions } from '../../src/features/promotions/api/promotions.ts';

function consume(data) {
  const { bookingId, stay, changedStay } = data.expected;
  const rooms = parseRoomCatalogue(data.catalogue);
  assert.equal(rooms.length, 1);
  assert.deepEqual(rooms[0].imageUrls, ['/images/contract-suite.webp']);
  assert.equal(rooms[0].pricePerNight, 1000000);
  assert.equal(availabilityCount(data.availability), 1);
  assert.equal(activePromotions(data.promotions).length, 1);
  parseQuote(data.quote, stay);
  parsePayHereCheckout(data.checkout.checkout);
  const pending = parsePaymentStatus(data.pending, bookingId);
  assert.equal(pending.status, 'PENDING');
  assert.equal(pending.paidAmount, 0);
  const confirmed = parsePaymentStatus(data.confirmed, bookingId);
  assert.equal(confirmed.status, 'CONFIRMED');
  assert.equal(confirmed.paidAmount, confirmed.totalAmount);
  assert.equal(confirmed.emailStatus, 'SANDBOX');
  assert.equal(
    parseBookingList(data.profile, 'upcoming', 1).counts.upcoming,
    1,
  );
  parseBookingDetail(data.detail, bookingId);
  assert.equal(parseManagement(data.management, bookingId).eligible, true);
  parseChangeQuote(data.changeQuote, bookingId, changedStay);
  parseMutation(data.modified, bookingId, 'MODIFIED');
  parseMutation(data.cancelled, bookingId, 'CANCELLED');
  const cancellation = parsePaymentStatus(data.cancelledPayment, bookingId);
  assert.equal(cancellation.status, 'CANCELLED');
  assert.equal(cancellation.refundStatus, 'PENDING');
  const cancelledProfile = parseBookingList(
    data.cancelledProfile,
    'cancelled',
    1,
  );
  assert.equal(cancelledProfile.items[0].status, 'CANCELLED');
}

try {
  const data = JSON.parse(readFileSync(0, 'utf8'));
  consume(data);
  // AC2: a real producer payload must fail its consuming check after contract drift.
  const mutations = [
    (copy) => delete copy.catalogue.items[0].pricePerNight,
    (copy) => {
      copy.catalogue.items[0].imageUrls = 'renamed-field';
    },
    (copy) => delete copy.availability.availableCount,
    (copy) => delete copy.promotions.items[0].discountType,
    (copy) => delete copy.quote.totalAmount,
    (copy) => {
      copy.quote.lineItems = null;
    },
    (copy) => delete copy.checkout.checkout.fields.hash,
    (copy) => delete copy.confirmed.priceSnapshot,
    (copy) => {
      copy.confirmed.totalAmount += 1;
    },
    (copy) => delete copy.profile.counts,
    (copy) => {
      copy.detail.bookingId = copy.expected.stay.roomTypeId;
    },
    (copy) => delete copy.management.eligible,
    (copy) => delete copy.changeQuote.quoteToken,
    (copy) => delete copy.modified.operation,
    (copy) => {
      copy.cancelled.operation.kind = 'MODIFIED';
    },
    (copy) => {
      copy.cancelledPayment.balanceAmount = 1;
    },
  ];
  for (const mutate of mutations) {
    const copy = structuredClone(data);
    mutate(copy);
    assert.throws(() => consume(copy));
  }
  process.stdout.write(
    JSON.stringify({
      consumerContracts: 'passed',
      rejectedDriftCases: mutations.length,
    }),
  );
} catch (error) {
  process.stderr.write(`Consumer contract failed: ${error.message}\n`);
  process.exitCode = 1;
}
