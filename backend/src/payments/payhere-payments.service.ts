import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { BookingsService } from '../bookings/bookings.service';
import type { CreateReservationDto } from '../bookings/dto/create-reservation.dto';
import { ConfirmationEmailService } from './confirmation-email.service';
import { PayHereProvider, payhereAmount } from './payhere-provider';
import { PayHereRepository } from './payhere.repository';
import type { BillingDto } from './payhere.dto';
import type { PaymentOption } from './payment-policy';

@Injectable()
export class PayHerePaymentsService {
  private readonly logger = new Logger(PayHerePaymentsService.name);
  constructor(
    private readonly bookings: BookingsService,
    private readonly repository: PayHereRepository,
    private readonly provider: PayHereProvider,
    private readonly email: ConfirmationEmailService,
  ) {}

  async options() {
    try {
      const settings = this.provider.settings();
      return {
        available: await this.repository.supported(),
        depositPercent: null,
        checkoutMinutes: settings.minutes,
        sandbox: settings.mode === 'sandbox',
      };
    } catch {
      return {
        available: false,
        depositPercent: null,
        checkoutMinutes: null,
        sandbox: true,
      };
    }
  }
  recover(guestId: string, quoteId: string) {
    return this.run(() => this.repository.recover(guestId, quoteId));
  }

  async start(
    guestId: string,
    input: CreateReservationDto,
    option: PaymentOption,
    billing: BillingDto,
    key?: string,
  ) {
    this.fullOnly(option);
    this.provider.settings();
    if (!(await this.repository.supported()))
      throw new ServiceUnavailableException(
        'PayHere database migration is required.',
      );
    const booking = await this.bookings.createReservation(guestId, input, key);
    return this.run(() =>
      this.buildCheckout(guestId, booking.bookingId, billing),
    );
  }

  async resume(guestId: string, id: string, option: PaymentOption) {
    this.fullOnly(option);
    return this.run(async () => {
      // Check for an already received payment before issuing another form.
      await this.reconcileOwned(guestId, id);
      return this.buildCheckout(guestId, id);
    });
  }

  private async buildCheckout(
    guestId: string,
    id: string,
    billing?: BillingDto,
  ) {
    const settings = this.provider.settings();
    const payment = await this.repository.prepareCheckout(
      id,
      guestId,
      settings.mode,
      billing,
    );
    const status = await this.repository.status(id, guestId);
    if (!status.guestEmail)
      throw new ServiceUnavailableException('A guest email is required.');
    return {
      bookingId: id,
      checkout: this.provider.checkout(
        payment.paymentId,
        payment.amount,
        id,
        status.guestEmail,
        payment.billing,
      ),
      state: 'READY',
    };
  }

  private async reconcileOwned(guestId: string, id: string) {
    const payment = await this.repository.metadata(id, guestId);
    if (!payment) return;
    const settings = this.provider.settings();
    if (payment.provider !== 'PAYHERE' || payment.environment !== settings.mode)
      throw new BadRequestException(
        'This booking belongs to another payment provider or environment.',
      );
    const receipts = await this.provider.receipts(payment.paymentId);
    const result = await this.repository.settleReceipts(
      id,
      payment.paymentId,
      settings.mode,
      receipts,
    );
    if (result.reviewRequired)
      this.logger.warn({
        event: 'payhere_payment_review_required',
        bookingId: id,
      });
    await this.email.send(id);
  }

  async status(guestId: string, id: string) {
    return this.run(async () => {
      let verificationDelayed = false;
      try {
        await this.reconcileOwned(guestId, id);
      } catch {
        verificationDelayed = true;
      }
      const status = await this.repository.status(id, guestId);
      const payment = await this.repository.metadata(id, guestId);
      return {
        ...status,
        verificationDelayed,
        paymentState: payment?.reviewRequired
          ? 'REVIEW_REQUIRED'
          : status.paymentState,
      };
    });
  }

  async cancel(guestId: string, id: string) {
    return this.run(async () => {
      await this.reconcileOwned(guestId, id);
      await this.repository.cancelCheckout(id, guestId);
      return this.repository.status(id, guestId);
    });
  }

  async notify(body: unknown) {
    return this.run(async () => {
      const notification = this.provider.verify(body);
      const located = await this.repository.locate(notification.orderId);
      const settings = this.provider.settings();
      if (located.environment !== settings.mode)
        throw new BadRequestException('Payment environment mismatch.');
      // Non-success notifications never cancel a possibly concurrent successful attempt.
      if (!['2', '-3'].includes(notification.status)) return { received: true };
      const receipts = await this.provider.receipts(notification.orderId);
      if (
        !receipts.some(
          (r) =>
            r.paymentId === notification.paymentId &&
            payhereAmount(r.amount) === notification.amount &&
            (notification.status === '-3' ? r.status === 'CHARGEBACKED' : true),
        )
      )
        throw new ServiceUnavailableException(
          'PayHere notification is not yet corroborated.',
        );
      const result = await this.repository.settleReceipts(
        located.bookingId,
        notification.orderId,
        settings.mode,
        receipts,
      );
      if (result.reviewRequired)
        this.logger.warn({
          event: 'payhere_payment_review_required',
          bookingId: located.bookingId,
        });
      await this.email.send(located.bookingId);
      return { received: true };
    });
  }

  private fullOnly(option: PaymentOption) {
    if (option !== 'FULL')
      throw new BadRequestException(
        'PayHere checkout currently supports full payment only.',
      );
  }
  private async run<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      // No provider response bodies, billing data or credentials in logs.
      this.logger.warn({ event: 'payhere_request_failed' });
      throw new ServiceUnavailableException(
        'Payment verification is temporarily unavailable. Keep your booking reference and retry.',
      );
    }
  }
}
