import type { ConfigService } from '@nestjs/config';
import { isEmail } from 'class-validator';
import type { EmailState } from './confirmation-email.repository';

/** Shared transport for confirmations and booking updates, with honest delivery states. */
export async function deliverBookingEmail(
  config: ConfigService,
  email: string,
  subject: string,
  textContent: string,
): Promise<EmailState> {
  const mode = config.get<string>('BOOKING_EMAIL_MODE', 'off');
  const key = config.get<string>('BREVO_API_KEY');
  const from =
    config.get<string>('BOOKING_EMAIL_FROM') ||
    config.get<string>('CONTACT_EMAIL_FROM');
  if (
    !['sandbox', 'send'].includes(mode) ||
    !key ||
    !from ||
    !isEmail(from) ||
    !isEmail(email) ||
    (mode === 'send' && config.get<string>('NODE_ENV') !== 'production')
  )
    return 'FAILED';
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': key, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        to: [{ email }],
        sender: { email: from },
        subject,
        textContent,
        ...(mode === 'sandbox' ? { headers: { 'X-Sib-Sandbox': 'drop' } } : {}),
      }),
    });
    if (response.status === 201) {
      const result: unknown = await response.json();
      if (
        result &&
        typeof result === 'object' &&
        'messageId' in result &&
        typeof result.messageId === 'string' &&
        result.messageId.trim()
      )
        return mode === 'sandbox' ? 'SANDBOX' : 'ACCEPTED';
    } else if (response.status >= 400 && response.status < 500) return 'FAILED';
  } catch {
    /* Ambiguous acceptance must not trigger an automatic duplicate send. */
  }
  return 'UNKNOWN';
}
