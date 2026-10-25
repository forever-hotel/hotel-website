'use server';

import { cookies } from 'next/headers';
import { fetchQuote } from './quote-client';
import type { QuoteResult, Stay } from './booking';

export async function requestQuote(stay: Stay): Promise<QuoteResult> {
  const token = (await cookies()).get('hw_guest_session')?.value;
  return fetchQuote(process.env.API_GATEWAY_URL, token, stay);
}
