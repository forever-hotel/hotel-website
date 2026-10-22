import { bookingError, parseQuote } from './booking.ts';
import type { QuoteResult, Stay } from './booking.ts';

/** Server-side only: the session is supplied by the authenticated server action. */
export async function fetchQuote(
  base: string | undefined,
  token: string | undefined,
  stay: Stay,
): Promise<QuoteResult> {
  if (!token) return { error: bookingError(401), signIn: true };
  try {
    if (!base) throw new Error('Not configured');
    const response = await fetch(
      `${base.replace(/\/$/, '')}/hw/booking-quotes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomTypeId: stay.roomTypeId,
          checkInDate: stay.checkInDate,
          checkOutDate: stay.checkOutDate,
          numberOfGuests: stay.numberOfGuests,
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok)
      return {
        error: bookingError(response.status),
        signIn: response.status === 401,
      };
    return { quote: parseQuote(await response.json(), stay) };
  } catch {
    return { error: bookingError(503) };
  }
}
