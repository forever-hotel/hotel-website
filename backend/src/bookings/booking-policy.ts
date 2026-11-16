/** Product defaults for review; these durations are not statutory requirements. */
export const BOOKING_POLICY = {
  currency: 'LKR',
  timeZone: 'Asia/Colombo',
  quoteLifetimeSeconds: 10 * 60,
  reservationHoldSeconds: 20 * 60,
} as const;

export function hotelDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: BOOKING_POLICY.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: string) =>
    parts.find((part) => part.type === type)!.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function expiresAt(now: Date, lifetimeSeconds: number): Date {
  if (
    !Number.isFinite(now.getTime()) ||
    !Number.isSafeInteger(lifetimeSeconds) ||
    lifetimeSeconds <= 0
  )
    throw new RangeError('Invalid expiry configuration');
  const expiry = new Date(now.getTime() + lifetimeSeconds * 1000);
  if (!Number.isFinite(expiry.getTime()))
    throw new RangeError('Invalid expiry configuration');
  return expiry;
}
