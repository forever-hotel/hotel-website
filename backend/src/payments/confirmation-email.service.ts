import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { deliverBookingEmail } from './booking-email-transport';
import {
  ConfirmationEmailRepository,
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
      const state = await deliverBookingEmail(
        this.config,
        receipt.email,
        `Booking confirmation ${receipt.bookingId}`,
        receiptText(receipt),
      );
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
