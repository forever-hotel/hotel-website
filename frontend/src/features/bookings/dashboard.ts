export const categories = ['upcoming', 'past', 'cancelled'] as const;
export type Category = (typeof categories)[number];
export type GuestBooking = {
  bookingId: string;
  roomType: string;
  roomImage: string | null;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  status: string;
  holdExpired: boolean;
  category: Category;
  totalAmount: number;
  currency: string | null;
};
export type BookingList = {
  items: GuestBooking[];
  counts: Record<Category | 'total', number>;
  category: Category;
  page: number;
  pageSize: number;
};
export const isBookingId = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function categoryParam(value: unknown): Category {
  return categories.includes(value as Category)
    ? (value as Category)
    : 'upcoming';
}
export function pageParam(value: unknown): number {
  const page =
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : 1;
  return Number.isSafeInteger(page) && page >= 1 && page <= 1000000 ? page : 1;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid booking response');
  return value as Record<string, unknown>;
}
function date(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
function count(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
export function parseBooking(value: unknown): GuestBooking {
  const row = record(value);
  if (
    typeof row.bookingId !== 'string' ||
    !isBookingId(row.bookingId) ||
    !(typeof row.roomType === 'string' || row.roomType === null) ||
    !(typeof row.roomImage === 'string' || row.roomImage === null) ||
    !date(row.checkInDate) ||
    !date(row.checkOutDate) ||
    row.checkOutDate <= row.checkInDate ||
    !count(row.numberOfGuests) ||
    row.numberOfGuests < 1 ||
    ![
      'PENDING',
      'CONFIRMED',
      'CHECKED_IN',
      'CHECKED_OUT',
      'CANCELLED',
    ].includes(row.status as string) ||
    typeof row.holdExpired !== 'boolean' ||
    !categories.includes(row.category as Category) ||
    !count(row.totalAmount) ||
    !(
      row.currency === null ||
      (typeof row.currency === 'string' && /^[A-Z]{3}$/.test(row.currency))
    )
  )
    throw new Error('Invalid booking response');
  return {
    bookingId: row.bookingId,
    roomType: row.roomType || 'Room',
    roomImage: row.roomImage,
    checkInDate: row.checkInDate,
    checkOutDate: row.checkOutDate,
    numberOfGuests: row.numberOfGuests,
    status: row.status as string,
    holdExpired: row.holdExpired,
    category: row.category as Category,
    totalAmount: row.totalAmount,
    currency: row.currency as string | null,
  };
}
export function parseBookingList(
  value: unknown,
  category: Category,
  page: number,
): BookingList {
  const row = record(value);
  const counts = record(row.counts);
  if (
    !Array.isArray(row.items) ||
    row.items.length > 20 ||
    row.category !== category ||
    row.page !== page ||
    row.pageSize !== 20 ||
    ![counts.upcoming, counts.past, counts.cancelled, counts.total].every(
      count,
    ) ||
    counts.total !==
      Number(counts.upcoming) + Number(counts.past) + Number(counts.cancelled)
  )
    throw new Error('Invalid booking list');
  const items = row.items.map(parseBooking);
  if (
    items.some((item) => item.category !== category) ||
    new Set(items.map((item) => item.bookingId)).size !== items.length
  )
    throw new Error('Invalid booking list');
  return {
    items,
    counts: counts as BookingList['counts'],
    category,
    page,
    pageSize: 20,
  };
}
export function parseBookingDetail(value: unknown, id: string) {
  const booking = parseBooking(value);
  const row = record(value);
  if (
    booking.bookingId !== id ||
    !(row.specialRequests === null || typeof row.specialRequests === 'string')
  )
    throw new Error('Invalid booking detail');
  return { ...booking, specialRequests: row.specialRequests as string | null };
}
export function bookingPrice(booking: GuestBooking): string {
  if (!booking.currency) return 'Price currency unavailable';
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: booking.currency,
  }).format(booking.totalAmount / 100);
}
export function bookingStatus(booking: GuestBooking): string {
  if (booking.holdExpired) return 'Expired';
  return (
    {
      PENDING: 'Payment pending',
      CONFIRMED: 'Confirmed',
      CHECKED_IN: 'Checked in',
      CHECKED_OUT: 'Checked out',
      CANCELLED: 'Cancelled',
    }[booking.status] || booking.status
  );
}
export function stayDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}
export function bookingNights(booking: GuestBooking): number {
  return Math.round(
    (Date.parse(booking.checkOutDate) - Date.parse(booking.checkInDate)) /
      86400000,
  );
}
