import {
  ConflictException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { BookingsService } from '../bookings/bookings.service';
import { CreateReservationDto } from '../bookings/dto/create-reservation.dto';
import { PaymentRepository } from '../database/repositories/payment.repository';
import { amountDue, PaymentOption } from './payment-policy';
import { StripeProvider } from './stripe-provider';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly bookings: BookingsService,
    private readonly repository: PaymentRepository,
    private readonly stripe: StripeProvider,
  ) {}

  options() {
    try {
      const settings = this.stripe.settings();
      return {
        available: true,
        depositPercent: settings.depositPercent,
        checkoutMinutes: settings.minutes,
      };
    } catch {
      return { available: false, depositPercent: null, checkoutMinutes: null };
    }
  }

  recover(guestId: string, quoteId: string) {
    return this.run(() => this.repository.recover(guestId, quoteId));
  }

  async start(
    guestId: string,
    input: CreateReservationDto,
    option: PaymentOption,
    key: string | undefined,
  ) {
    const settings = this.stripe.settings();
    // Reject unconfigured deposit choice before taking any inventory hold.
    amountDue(10000, option, settings.depositPercent);
    const booking = await this.bookings.createReservation(guestId, input, key);
    try {
      return await this.resume(guestId, booking.bookingId, option);
    } catch {
      // The durable hold exists. Return its identity so refresh/retry cannot multiply holds.
      return {
        bookingId: booking.bookingId,
        checkoutUrl: null,
        state: 'RETRY_REQUIRED',
      };
    }
  }

  async resume(guestId: string, bookingId: string, option: PaymentOption) {
    return this.run(async () => {
      const settings = this.stripe.settings();
      const payment = await this.repository.prepare(
        bookingId,
        guestId,
        option,
        settings.depositPercent,
        settings.minutes,
      );
      const session = payment.sessionId
        ? await this.stripe.retrieve(payment.sessionId)
        : await this.stripe.create(
            bookingId,
            payment.paymentId,
            payment.amount,
            new Date(payment.expiresAt),
          );
      if (
        session.livemode ||
        session.mode !== 'payment' ||
        session.client_reference_id !== bookingId ||
        session.metadata?.paymentId !== payment.paymentId ||
        session.metadata?.bookingId !== bookingId ||
        session.amount_total !== payment.amount ||
        session.currency !== 'lkr'
      )
        throw new ConflictException('Stripe session does not match checkout.');
      await this.repository.attach(bookingId, guestId, session);
      if (session.status !== 'open') {
        await this.reconcile(session.id);
        return { bookingId, checkoutUrl: null, state: 'CHECK_STATUS' };
      }
      const url = new URL(session.url || '');
      if (
        url.protocol !== 'https:' ||
        url.hostname !== 'checkout.stripe.com' ||
        url.username ||
        url.password
      )
        throw new ConflictException('Invalid payment destination.');
      return { bookingId, checkoutUrl: url.toString(), state: 'READY' };
    });
  }

  async reconcile(sessionId: string, failed = false) {
    return this.run(async () => {
      const session = await this.stripe.retrieve(sessionId);
      const refund = failed
        ? await this.repository.settle(session, true)
        : await this.repository.settle(session);
      if (refund) {
        const result = await this.stripe.refund(
          refund.intent,
          refund.paymentId,
        );
        await this.repository.refunded(
          refund.bookingId,
          refund.paymentId,
          result.status === 'succeeded',
        );
        if (result.status !== 'succeeded')
          throw new ServiceUnavailableException(
            'Payment refund is pending. Please retry verification.',
          );
      }
    });
  }

  async status(guestId: string, bookingId: string) {
    return this.run(async () => {
      const session = await this.repository.sessionFor(bookingId, guestId);
      let verificationDelayed = false;
      if (session) {
        try {
          await this.reconcile(session);
        } catch {
          verificationDelayed = true;
        }
      }
      return {
        ...(await this.repository.status(bookingId, guestId)),
        verificationDelayed,
      };
    });
  }

  async cancel(guestId: string, bookingId: string) {
    return this.run(async () => {
      const sessionId = await this.repository.sessionFor(bookingId, guestId);
      if (!sessionId)
        throw new ConflictException(
          'Checkout is still being prepared. Resume it before cancelling.',
        );
      const session = await this.stripe.retrieve(sessionId);
      if (session.status === 'open') {
        try {
          await this.stripe.expire(sessionId);
        } catch {
          /* A concurrent completed payment must be verified before cancellation. */
        }
      }
      await this.reconcile(sessionId);
      return this.repository.status(bookingId, guestId);
    });
  }

  async webhook(body: Buffer | undefined, signature: string | undefined) {
    const event = this.stripe.verify(body, signature);
    if (event.livemode)
      throw new ConflictException('Only Stripe test events are accepted.');
    if (
      [
        'checkout.session.completed',
        'checkout.session.async_payment_succeeded',
        'checkout.session.async_payment_failed',
        'checkout.session.expired',
      ].includes(event.type)
    ) {
      if ('id' in event.data.object && typeof event.data.object.id === 'string')
        await this.reconcile(
          event.data.object.id,
          event.type === 'checkout.session.async_payment_failed',
        );
    }
    return { received: true };
  }

  private async run<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException({
        error: 'PAYMENT_UNAVAILABLE',
        message:
          'Payment verification is temporarily unavailable. Keep your booking reference and retry.',
      });
    }
  }
}
