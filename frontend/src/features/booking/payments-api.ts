import { parsePaymentStatus } from './payment.ts';
import type { PaymentOptions } from './payment.ts';

export async function paymentRequest(
  base: string | undefined,
  token: string | undefined,
  path: string,
  body?: unknown,
  key?: string,
): Promise<Response> {
  if (!base || !token)
    throw new Error('Sign in again or retry when the service is available.');
  return fetch(`${base.replace(/\/$/, '')}/hw/payments${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(key ? { 'Idempotency-Key': key } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });
}
export async function readPaymentStatus(
  base: string | undefined,
  token: string | undefined,
  id: string,
) {
  const response = await paymentRequest(base, token, `/${id}`);
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? 'Your session expired. Sign in again.'
        : 'Your booking could not be loaded. Please retry.',
    );
  return parsePaymentStatus(await response.json(), id);
}
export async function readPaymentOptions(
  base: string | undefined,
  token: string | undefined,
): Promise<PaymentOptions> {
  try {
    const response = await paymentRequest(base, token, '/options');
    if (!response.ok) throw new Error('Unavailable');
    const value: unknown = await response.json();
    if (
      !value ||
      typeof value !== 'object' ||
      !('available' in value) ||
      typeof value.available !== 'boolean'
    )
      throw new Error('Invalid options');
    const row = value as PaymentOptions;
    if (
      row.available &&
      (!Number.isInteger(row.checkoutMinutes) ||
        row.checkoutMinutes! < 31 ||
        row.checkoutMinutes! > 120)
    )
      throw new Error('Invalid checkout duration');
    return {
      available: row.available,
      depositPercent:
        Number.isInteger(row.depositPercent) &&
        row.depositPercent! > 0 &&
        row.depositPercent! < 100
          ? row.depositPercent
          : null,
      checkoutMinutes:
        Number.isInteger(row.checkoutMinutes) && row.checkoutMinutes! >= 31
          ? row.checkoutMinutes
          : null,
    };
  } catch {
    return { available: false, depositPercent: null, checkoutMinutes: null };
  }
}
