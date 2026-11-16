import { calculateRoomCharge } from './room-charge';
import { CreateBookingQuoteDto } from './dto/create-booking-quote.dto';
import { createValidationPipe } from '../common/pipes/validation.pipe';

describe('Room charge rules for booking quotes', () => {
  const stay = {
    roomTypeId: '11111111-1111-4111-8111-111111111111',
    checkInDate: '2026-12-10',
    checkOutDate: '2026-12-12',
    numberOfGuests: 2,
  };
  it('uses server-side integer rates and checkout-exclusive nights', () => {
    expect(calculateRoomCharge(stay, 250000, 2)).toEqual({
      currency: 'LKR',
      nights: 2,
      nightlyRate: 250000,
      subtotal: 500000,
      lineItems: [
        { code: 'ROOM', quantity: 2, unitAmount: 250000, amount: 500000 },
      ],
    });
  });
  it('handles a leap-day stay without timezone conversions', () => {
    expect(
      calculateRoomCharge(
        { ...stay, checkInDate: '2028-02-28', checkOutDate: '2028-03-01' },
        100,
        2,
      ).nights,
    ).toBe(2);
  });
  it.each([
    { checkInDate: '2026-02-30' },
    { checkInDate: 'not-a-date' },
    { checkOutDate: '2026-12-10' },
    { checkOutDate: '2026-12-09' },
    { checkOutDate: '2027-12-12' },
    { numberOfGuests: 0 },
    { numberOfGuests: 3 },
    { numberOfGuests: 1.5 },
  ])('rejects invalid stay %j', (invalid) => {
    expect(() =>
      calculateRoomCharge({ ...stay, ...invalid }, 100, 2),
    ).toThrow();
  });
  it.each([
    [0, 2],
    [1.5, 2],
    [100, 0],
    [100, NaN],
  ])('rejects invalid catalogue rate/capacity %j', (rate, capacity) => {
    expect(() => calculateRoomCharge(stay, rate, capacity)).toThrow();
  });
  it('rejects totals outside the infra integer range', () => {
    expect(() => calculateRoomCharge(stay, 2147483647, 2)).toThrow();
  });
  it.each([
    'totalAmount',
    'guestId',
    'promoCode',
    'numberOfRooms',
    'childCount',
    'mealPlan',
  ])('rejects unsupported or client-owned quote input %s', async (field) => {
    await expect(
      createValidationPipe().transform(
        { ...stay, [field]: 1 },
        { type: 'body', metatype: CreateBookingQuoteDto },
      ),
    ).rejects.toThrow();
  });
  it('accepts the supported quote request', async () => {
    await expect(
      createValidationPipe().transform(stay, {
        type: 'body',
        metatype: CreateBookingQuoteDto,
      }),
    ).resolves.toEqual(stay);
  });
});
