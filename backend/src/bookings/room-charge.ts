import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { CreateBookingQuoteDto } from './dto/create-booking-quote.dto';

/** Calculates only the room charge; tax, discounts and final payable policy are separate. */
export function calculateRoomCharge(
  stay: CreateBookingQuoteDto,
  nightlyRate: number,
  maxGuests: number,
) {
  const validDate = (date: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date;
  const nights =
    (Date.parse(stay.checkOutDate) - Date.parse(stay.checkInDate)) / 86400000;
  if (
    !validDate(stay.checkInDate) ||
    !validDate(stay.checkOutDate) ||
    !Number.isInteger(nights) ||
    nights < 1 ||
    nights > 90
  ) {
    throw new BadRequestException({
      error: 'VALIDATION_FAILED',
      message: 'Choose valid hotel dates, 1 to 90 nights apart.',
    });
  }
  if (
    !Number.isSafeInteger(maxGuests) ||
    maxGuests < 1 ||
    !Number.isSafeInteger(nightlyRate) ||
    nightlyRate < 1
  ) {
    throw new ServiceUnavailableException({
      error: 'QUOTE_UNAVAILABLE',
      message: 'The room rate or capacity is not configured correctly.',
    });
  }
  if (
    !Number.isSafeInteger(stay.numberOfGuests) ||
    stay.numberOfGuests < 1 ||
    stay.numberOfGuests > maxGuests
  ) {
    throw new BadRequestException({
      error: 'CAPACITY_EXCEEDED',
      message: 'Choose a guest count within the room capacity.',
    });
  }
  const subtotal = nights * nightlyRate;
  if (!Number.isSafeInteger(subtotal) || subtotal > 2147483647) {
    throw new BadRequestException({
      error: 'QUOTE_TOTAL_OUT_OF_RANGE',
      message: 'The room charge exceeds the supported amount.',
    });
  }
  return {
    currency: 'LKR' as const,
    nights,
    nightlyRate,
    subtotal,
    lineItems: [
      {
        code: 'ROOM',
        quantity: nights,
        unitAmount: nightlyRate,
        amount: subtotal,
      },
    ],
  };
}
