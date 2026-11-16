import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { depositPercentage } from './payment-policy';

@Injectable()
export class StripeProvider {
  constructor(private readonly config: ConfigService) {}

  settings() {
    const key = this.config.get<string>('STRIPE_SECRET_KEY') || '';
    const webhookSecret =
      this.config.get<string>('STRIPE_WEBHOOK_SECRET') || '';
    const minutes = Number(
      this.config.get<string>('STRIPE_CHECKOUT_MINUTES') || '35',
    );
    const origin = this.config.get<string>('PAYMENT_RETURN_ORIGIN') || '';
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw this.unavailable();
    }
    if (
      !key.startsWith('sk_test_') ||
      !webhookSecret.startsWith('whsec_') ||
      !Number.isInteger(minutes) ||
      minutes < 31 ||
      minutes > 120 ||
      url.origin !== origin ||
      url.username ||
      url.password ||
      (url.protocol !== 'https:' &&
        !(
          url.protocol === 'http:' &&
          this.config.get<string>('NODE_ENV') !== 'production' &&
          ['localhost', '127.0.0.1'].includes(url.hostname)
        ))
    )
      throw this.unavailable();
    return {
      key,
      webhookSecret,
      minutes,
      origin,
      depositPercent: depositPercentage(
        this.config.get<string>('PAYMENT_DEPOSIT_PERCENT'),
      ),
    };
  }
  private client() {
    return new Stripe(this.settings().key, {
      maxNetworkRetries: 1,
      timeout: 10000,
    });
  }
  private unavailable() {
    return new ServiceUnavailableException({
      error: 'PAYMENT_UNAVAILABLE',
      message:
        'Stripe test checkout is not configured. Please contact the hotel.',
    });
  }

  async create(
    bookingId: string,
    paymentId: string,
    amount: number,
    expiresAt: Date,
  ) {
    const { origin } = this.settings();
    const returnUrl = `${origin}/booking/confirmation?bookingId=${encodeURIComponent(bookingId)}`;
    return this.client().checkout.sessions.create(
      {
        mode: 'payment',
        allowed_payment_method_types: ['card'],
        client_reference_id: bookingId,
        metadata: { bookingId, paymentId },
        success_url: returnUrl,
        cancel_url: `${returnUrl}&cancelled=1`,
        expires_at: Math.floor(expiresAt.getTime() / 1000),
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'lkr',
              unit_amount: amount,
              product_data: { name: 'Forever City Hotel reservation payment' },
            },
          },
        ],
      },
      { idempotencyKey: `hw-checkout-${paymentId}` },
    );
  }
  retrieve(id: string) {
    return this.client().checkout.sessions.retrieve(id);
  }
  expire(id: string) {
    return this.client().checkout.sessions.expire(id);
  }
  verify(
    body: Buffer | undefined,
    signature: string | undefined,
  ): Stripe.Event {
    if (!body || !signature)
      throw new BadRequestException('Missing Stripe signature.');
    try {
      return this.client().webhooks.constructEvent(
        body,
        signature,
        this.settings().webhookSecret,
      );
    } catch {
      throw new BadRequestException('Invalid Stripe signature.');
    }
  }
  async refund(intent: string, paymentId: string) {
    const stripe = this.client();
    const refund = await stripe.refunds.create(
      { payment_intent: intent, metadata: { paymentId } },
      { idempotencyKey: `hw-expired-refund-${paymentId}` },
    );
    return stripe.refunds.retrieve(refund.id);
  }
}
