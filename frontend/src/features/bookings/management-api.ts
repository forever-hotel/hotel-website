import {
  changeInput,
  managementReason,
  parseChangeQuote,
  parseManagement,
  parseMutation,
} from './management.ts';
import type {
  ChangeInput,
  ChangeQuote,
  Failure,
  ManagementState,
  MutationResult,
  Result,
} from './management.ts';
import { isBookingId } from './dashboard.ts';

export async function managementRequest(
  base: string | undefined,
  token: string | undefined,
  id: string,
  path: string,
  body?: unknown,
  key?: string,
) {
  if (!base || !token || !isBookingId(id))
    throw new Error('Management unavailable');
  return fetch(`${base.replace(/\/$/, '')}/hw/bookings/${id}/${path}`, {
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
async function failure(response: Response): Promise<Failure> {
  if (response.status === 401)
    return {
      kind: 'auth',
      error: 'Your session expired. Sign in again to manage this booking.',
    };
  if (response.status === 404)
    return {
      kind: 'invalid',
      error: 'This booking is unavailable for your account.',
    };
  if (response.status === 409) {
    let error =
      'The booking, deadline or room availability changed. Refresh and review your booking before trying again.';
    try {
      const value: unknown = await response.json();
      if (value && typeof value === 'object' && 'error' in value)
        error = managementReason(value);
    } catch {
      /* Generic conflict is safe to show. */
    }
    return { kind: 'conflict', error };
  }
  return {
    kind: 'unavailable',
    error: 'The service could not complete this request. Please try again.',
  };
}
export async function readManagement(
  base: string | undefined,
  token: string | undefined,
  id: string,
): Promise<Result<ManagementState>> {
  if (!token) return { kind: 'auth', error: 'Sign in to manage your booking.' };
  try {
    const response = await managementRequest(base, token, id, 'management');
    return response.ok
      ? { value: parseManagement(await response.json(), id) }
      : await failure(response);
  } catch {
    return {
      kind: 'unavailable',
      error: 'Booking management could not be loaded. Refresh to try again.',
    };
  }
}
export async function previewChange(
  base: string | undefined,
  token: string | undefined,
  id: string,
  raw: ChangeInput,
): Promise<Result<ChangeQuote>> {
  if (!token) return { kind: 'auth', error: 'Sign in to manage your booking.' };
  let input: ChangeInput;
  try {
    input = changeInput(raw);
  } catch {
    return {
      kind: 'invalid',
      error:
        'Choose valid dates, a room and guest count. Use plain text for requests (up to 300 characters).',
    };
  }
  try {
    const response = await managementRequest(
      base,
      token,
      id,
      'change-quote',
      input,
    );
    return response.ok
      ? { value: parseChangeQuote(await response.json(), id, input) }
      : await failure(response);
  } catch {
    return {
      kind: 'unavailable',
      error:
        'A change preview could not be loaded. Your booking has not been changed.',
    };
  }
}
export async function submitManagement(
  base: string | undefined,
  token: string | undefined,
  id: string,
  attempt:
    | { kind: 'MODIFIED'; quoteToken: string; key: string }
    | { kind: 'CANCELLED'; revision: number; key: string },
): Promise<Result<MutationResult>> {
  if (!token)
    return {
      kind: 'auth',
      error: 'Your session expired. Sign in again to verify your booking.',
    };
  if (
    !isBookingId(id) ||
    !attempt ||
    !['MODIFIED', 'CANCELLED'].includes(attempt.kind) ||
    typeof attempt.key !== 'string' ||
    !/^[A-Za-z0-9_-]{8,128}$/.test(attempt.key) ||
    (attempt.kind === 'MODIFIED'
      ? typeof attempt.quoteToken !== 'string' ||
        attempt.quoteToken.length > 16000 ||
        !/^[\w-]+\.[\w-]+$/.test(attempt.quoteToken)
      : !Number.isSafeInteger(attempt.revision) || attempt.revision < 0)
  )
    return {
      kind: 'invalid',
      error: 'Review your booking and start a new request.',
    };
  try {
    const response = await managementRequest(
      base,
      token,
      id,
      attempt.kind === 'MODIFIED' ? 'changes' : 'cancellations',
      attempt.kind === 'MODIFIED'
        ? { quoteToken: attempt.quoteToken }
        : { revision: attempt.revision },
      attempt.key,
    );
    // A proxy 5xx/timeout can follow a committed mutation. Retain and retry the exact attempt.
    if (response.status >= 500 || response.status === 408)
      throw new Error('Uncertain outcome');
    return response.ok
      ? { value: parseMutation(await response.json(), id, attempt.kind) }
      : await failure(response);
  } catch {
    return {
      kind: 'uncertain',
      error:
        'We could not verify the result. Keep this page open and retry the same request, or review your current booking. It may already have been saved.',
    };
  }
}
