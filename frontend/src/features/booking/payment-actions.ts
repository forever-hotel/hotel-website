'use server';

import { cookies } from 'next/headers';
import { paymentRequest, readPaymentOptions } from './payments-api';
import { safeStripeUrl, validBookingId } from './payment';
import type { PaymentOption } from './payment';

async function credentials() {
  return {
    base: process.env.API_GATEWAY_URL,
    token: (await cookies()).get('hw_guest_session')?.value,
  };
}
export async function getPaymentOptions() {
  const { base, token } = await credentials();
  return readPaymentOptions(base, token);
}

async function paymentResult(response: Response): Promise<{
  bookingId?: string;
  checkoutUrl?: string | null;
  error?: string;
}> {
  if (!response.ok)
    return {
      error:
        response.status === 401
          ? 'Your session expired. Sign in again before retrying.'
          : response.status === 409
            ? 'This checkout changed or expired. Refresh your booking status before trying again.'
            : 'Checkout could not start. Check your existing booking before retrying.',
    };
  const data = await response.json();
  if (typeof data?.bookingId !== 'string' || !validBookingId(data.bookingId))
    throw new Error('Invalid checkout response');
  return {
    bookingId: data.bookingId,
    checkoutUrl: safeStripeUrl(data.checkoutUrl),
  };
}
export async function startStripePayment(
  quoteId: string,
  quoteToken: string,
  specialRequests: string,
  paymentOption: PaymentOption,
): Promise<{
  bookingId?: string;
  checkoutUrl?: string | null;
  error?: string;
}> {
  if (!validBookingId(quoteId)) return { error: 'Request a fresh quote.' };
  const { base, token } = await credentials();
  const previous = (await cookies()).get('hw_checkout_preview')?.value;
  if (previous && validBookingId(previous)) {
    try {
      const recovery = await paymentRequest(
        base,
        token,
        `/recovery/${previous}`,
      );
      if (!recovery.ok)
        return {
          error:
            'An earlier checkout could not be checked. Reload and retry recovery before starting another.',
        };
      const existing = await recovery.json();
      if (
        typeof existing?.bookingId === 'string' &&
        validBookingId(existing.bookingId)
      )
        return { bookingId: existing.bookingId, checkoutUrl: null };
    } catch {
      return {
        error: 'An earlier checkout may exist. Reload this page to recover it.',
      };
    }
  }
  (await cookies()).set('hw_checkout_preview', quoteId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7200,
  });
  try {
    return await paymentResult(
      await paymentRequest(
        base,
        token,
        '/checkout',
        { quoteToken, specialRequests, paymentOption },
        `hw-payment-${quoteId}`,
      ),
    );
  } catch {
    return {
      error:
        'Checkout may still be preparing. Reload this page to recover the existing attempt before starting another.',
    };
  }
}
export async function resumeStripePayment(
  id: string,
  paymentOption: PaymentOption,
) {
  if (!validBookingId(id)) return { error: 'Invalid booking reference.' };
  const { base, token } = await credentials();
  try {
    return await paymentResult(
      await paymentRequest(base, token, `/${id}/resume`, { paymentOption }),
    );
  } catch {
    return {
      error:
        'Payment service is unavailable. Keep this booking reference and retry.',
    };
  }
}
export async function cancelStripePayment(id: string) {
  if (!validBookingId(id)) return { error: 'Invalid booking reference.' };
  const { base, token } = await credentials();
  try {
    const response = await paymentRequest(base, token, `/${id}/cancel`, {});
    return response.ok
      ? {}
      : {
          error:
            'Cancellation could not be verified. Refresh status before trying again.',
        };
  } catch {
    return {
      error:
        'Payment service is unavailable. Please retry status verification.',
    };
  }
}
