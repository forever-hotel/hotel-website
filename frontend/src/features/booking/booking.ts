import { validStay } from '../rooms/availability.ts';

export type Stay = {
  roomTypeId: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
};
export type Quote = Stay & {
  quoteId: string;
  quoteToken: string;
  currency: 'LKR';
  nightlyRate: number;
  nights: number;
  subtotal: number;
  additionalCharges: number;
  totalAmount: number;
  rateBasis: 'INCLUSIVE' | 'EXCLUSIVE';
  lineItems: { code: string; label: string; amount: number }[];
  expiresAt: string;
};
export type QuoteResult =
  | { quote: Quote; error?: never; signIn?: never }
  | {
      error: string;
      signIn?: boolean;
      quote?: never;
    };

export function hotelToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  return ['year', 'month', 'day']
    .map((name) => parts.find((p) => p.type === name)!.value)
    .join('-');
}

export function stayError(
  stay: Stay,
  capacity: number,
  today = hotelToday(),
): string {
  if (
    !validStay(stay.checkInDate, stay.checkOutDate, stay.numberOfGuests) ||
    stay.checkInDate < today
  )
    return 'Choose today or a future check-in, a stay of 1–90 nights and a positive whole guest count.';
  if (stay.numberOfGuests > capacity)
    return `This room accommodates up to ${capacity} guests. Choose fewer guests or another room.`;
  return '';
}

export function bookingUrl(stay: Stay, step = 'details'): string {
  return `/booking?${new URLSearchParams({ roomTypeId: stay.roomTypeId, checkInDate: stay.checkInDate, checkOutDate: stay.checkOutDate, numberOfGuests: String(stay.numberOfGuests), step })}`;
}

export function guestErrors(
  email: string,
  confirmation: string,
  requests: string,
) {
  const errors: { email?: string; requests?: string } = {};
  if (
    !email ||
    confirmation.trim().toLowerCase() !== email.trim().toLowerCase()
  )
    errors.email = 'Enter the email address shown on your guest account.';
  if (
    requests.length > 300 ||
    /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(requests)
  )
    errors.requests =
      'Use plain text, up to 300 characters, for special requests.';
  return errors;
}

export function bookingError(status: number): string {
  if (status === 401)
    return 'Your session has expired. Sign in again to continue with your selected stay.';
  if (status === 409)
    return 'This room is no longer available or the quote has expired. Check your dates and request a fresh quote.';
  if (status === 400)
    return 'The stay is invalid. Check dates and room capacity.';
  if (status === 404)
    return 'This room is no longer available. Choose another room.';
  return 'We could not load your quote. Your selections are kept. Please try again.';
}

export function parseQuote(value: unknown, stay: Stay): Quote {
  if (!value || typeof value !== 'object') throw new Error('Invalid quote');
  const q = value as Quote;
  const money = [q.nightlyRate, q.subtotal, q.additionalCharges, q.totalAmount];
  if (
    q.roomTypeId !== stay.roomTypeId ||
    q.checkInDate !== stay.checkInDate ||
    q.checkOutDate !== stay.checkOutDate ||
    q.numberOfGuests !== stay.numberOfGuests ||
    q.currency !== 'LKR' ||
    typeof q.quoteId !== 'string' ||
    !q.quoteId ||
    typeof q.quoteToken !== 'string' ||
    !/^[\w-]+\.[\w-]+$/.test(q.quoteToken) ||
    !money.every((n) => Number.isSafeInteger(n) && n >= 0) ||
    q.totalAmount <= 0 ||
    q.totalAmount !== q.subtotal + q.additionalCharges ||
    !['INCLUSIVE', 'EXCLUSIVE'].includes(q.rateBasis) ||
    q.nights !==
      (Date.parse(stay.checkOutDate) - Date.parse(stay.checkInDate)) /
        86400000 ||
    q.subtotal !== q.nightlyRate * q.nights ||
    typeof q.expiresAt !== 'string' ||
    !Number.isFinite(Date.parse(q.expiresAt)) ||
    !Array.isArray(q.lineItems) ||
    !q.lineItems.every(
      (line) =>
        line &&
        typeof line.code === 'string' &&
        typeof line.label === 'string' &&
        Number.isSafeInteger(line.amount) &&
        line.amount >= 0,
    ) ||
    q.lineItems.reduce((sum, line) => sum + line.amount, 0) !==
      q.additionalCharges
  )
    throw new Error('Invalid quote');
  return q;
}

export function money(cents: number): string {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
  }).format(cents / 100);
}
