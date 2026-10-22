import { createHmac, timingSafeEqual } from 'crypto';
import { ServiceUnavailableException } from '@nestjs/common';
import type { CreateBookingQuoteDto } from './dto/create-booking-quote.dto';

export interface QuotePreview {
  quoteId: string;
  guestId: string;
  input: CreateBookingQuoteDto;
  pricing: Record<string, unknown>;
  expiresAt: string;
}

function signature(body: string, secret: string): Buffer {
  if (!secret || Buffer.byteLength(secret) < 32)
    throw new ServiceUnavailableException({
      error: 'QUOTE_SIGNING_UNAVAILABLE',
      message: 'Checkout signing is not configured.',
    });
  const key = createHmac('sha256', secret)
    .update('hw-price-preview-v1')
    .digest();
  return createHmac('sha256', key).update(body).digest();
}

export function signQuote(preview: QuotePreview, secret: string): string {
  const body = Buffer.from(JSON.stringify(preview)).toString('base64url');
  return `${body}.${signature(body, secret).toString('base64url')}`;
}

/** Verify ownership/signature; expiry is checked after persistent retry lookup. */
export function readQuote(
  token: string,
  secret: string,
  guestId: string,
): QuotePreview | null {
  if (token.length > 16000 || !/^[\w-]+\.[\w-]+$/.test(token)) return null;
  const [body, mac] = token.split('.');
  const expected = signature(body, secret);
  const supplied = Buffer.from(mac, 'base64url');
  if (
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  )
    return null;
  try {
    const preview = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as QuotePreview;
    if (
      preview.guestId !== guestId ||
      !preview.quoteId ||
      !preview.input ||
      !preview.pricing ||
      !Number.isFinite(Date.parse(preview.expiresAt))
    )
      return null;
    return preview;
  } catch {
    return null;
  }
}
