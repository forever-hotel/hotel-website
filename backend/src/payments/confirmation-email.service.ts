import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isEmail } from 'class-validator';
import {
  ConfirmationEmailRepository,
  EmailState,
  Receipt,
} from './confirmation-email.repository';

export function receiptText(receipt: Receipt): string {
  const money = (amount: number) =>
    `${receipt.currency} ${(amount / 100).toFixed(2)}`;
  return [
    'Your reservation is confirmed.',
    `Booking reference: ${receipt.bookingId}`,
    `Room: ${receipt.roomType}`,
    `Check-in: ${receipt.checkInDate}`,
    `Check-out: ${receipt.checkOutDate}`,
    `Total: ${money(receipt.totalAmount)}`,
    `Paid: ${money(receipt.paidAmount)}`,
    `Balance: ${money(Math.max(0, receipt.totalAmount - receipt.paidAmount))}`,
  ].join('\n');
}

@Injectable()
export class ConfirmationEmailService {
  private readonly logger = new Logger(ConfirmationEmailService.name);
  constructor(
    private readonly repository: ConfirmationEmailRepository,
    private readonly config: ConfigService,
  ) {}

  async send(id: string): Promise<void> {
    try {
      const receipt = await this.repository.claim(id);
      if (!receipt) return;
      let state: EmailState = 'FAILED';
      const mode = this.config.get<string>('BOOKING_EMAIL_MODE', 'off');
      const key = this.config.get<string>('BREVO_API_KEY');
      const from =
        this.config.get<string>('BOOKING_EMAIL_FROM') ||
        this.config.get<string>('CONTACT_EMAIL_FROM');
      if (
        ['sandbox', 'send'].includes(mode) &&
        key &&
        from &&
        isEmail(from) &&
        isEmail(receipt.email) &&
        (mode !== 'send' ||
          this.config.get<string>('NODE_ENV') === 'production')
      ) {
        // A timeout or 5xx may occur after acceptance. Do not automatically resend.
        state = 'UNKNOWN';
        try {
          const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'api-key': key,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(8000),
            body: JSON.stringify({
              to: [{ email: receipt.email }],
              sender: { email: from },
              subject: `Booking confirmation ${receipt.bookingId}`,
              textContent: receiptText(receipt),
              ...(mode === 'sandbox'
                ? { headers: { 'X-Sib-Sandbox': 'drop' } }
                : {}),
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
              state = mode === 'sandbox' ? 'SANDBOX' : 'ACCEPTED';
          } else if (response.status >= 400 && response.status < 500)
            state = 'FAILED';
        } catch {
          /* Ambiguous acceptance requires operator review. */
        }
      }
      await this.repository.finish(id, state);
      if (state === 'FAILED' || state === 'UNKNOWN')
        this.logger.warn({
          event: 'booking_email_retry_required',
          bookingId: id,
          state,
        });
    } catch {
      // Email must never roll back or misreport a settled payment. No PII/provider bodies.
      this.logger.warn({
        event: 'booking_email_review_required',
        bookingId: id,
      });
    }
  }
}
