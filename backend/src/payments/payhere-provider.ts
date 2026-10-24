import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import type { BillingDto } from './payhere.dto';

export const payhereMd5 = (value: string) =>
  createHash('md5').update(value).digest('hex').toUpperCase();
export const payhereAmount = (minor: number) => {
  if (!Number.isSafeInteger(minor) || minor <= 0)
    throw new BadRequestException('Invalid payment amount.');
  return `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`;
};
export interface PayHereReceipt {
  paymentId: string;
  orderId: string;
  amount: number;
  status: string;
}
export interface PayHereNotification {
  orderId: string;
  paymentId: string;
  amount: string;
  status: string;
}

@Injectable()
export class PayHereProvider {
  private token: { value: string; until: number; environment: string } | null =
    null;
  constructor(private readonly config: ConfigService) {}

  settings() {
    const mode = this.config.get<string>('PAYHERE_MODE', 'off');
    const merchantId = this.config.get<string>('PAYHERE_MERCHANT_ID') || '';
    const secret = this.config.get<string>('PAYHERE_MERCHANT_SECRET') || '';
    const appId = this.config.get<string>('PAYHERE_APP_ID') || '';
    const appSecret = this.config.get<string>('PAYHERE_APP_SECRET') || '';
    const origin = this.config.get<string>('PAYMENT_RETURN_ORIGIN') || '';
    const notify = this.config.get<string>('PAYHERE_NOTIFY_URL') || '';
    try {
      const returnUrl = new URL(origin);
      const notifyUrl = new URL(notify);
      const local = ['localhost', '127.0.0.1'].includes(returnUrl.hostname);
      if (
        !['sandbox', 'live'].includes(mode) ||
        !/^\d{5,15}$/.test(merchantId) ||
        !secret ||
        !appId ||
        !appSecret ||
        returnUrl.origin !== origin ||
        returnUrl.username ||
        returnUrl.password ||
        (returnUrl.protocol !== 'https:' &&
          !(mode === 'sandbox' && local && returnUrl.protocol === 'http:')) ||
        notifyUrl.protocol !== 'https:' ||
        notifyUrl.username ||
        notifyUrl.password ||
        notifyUrl.search ||
        notifyUrl.hash ||
        ['localhost', '127.0.0.1', '[::1]'].includes(notifyUrl.hostname) ||
        notifyUrl.pathname !== '/hw/payments/payhere/notify' ||
        (mode === 'live' &&
          this.config.get<string>('NODE_ENV') !== 'production')
      )
        throw new Error();
    } catch {
      throw new ServiceUnavailableException(
        'PayHere checkout is not configured.',
      );
    }
    return {
      mode,
      merchantId,
      secret,
      appId,
      appSecret,
      origin,
      notify,
      base:
        mode === 'live'
          ? 'https://www.payhere.lk'
          : 'https://sandbox.payhere.lk',
      minutes: 35,
    };
  }

  checkout(
    orderId: string,
    amount: number,
    bookingId: string,
    email: string,
    billing: BillingDto,
  ) {
    const s = this.settings();
    const formatted = payhereAmount(amount);
    const returnUrl = `${s.origin}/booking/confirmation?bookingId=${encodeURIComponent(bookingId)}`;
    return {
      action: `${s.base}/pay/checkout`,
      fields: {
        merchant_id: s.merchantId,
        order_id: orderId,
        amount: formatted,
        currency: 'LKR',
        hash: payhereMd5(
          s.merchantId + orderId + formatted + 'LKR' + payhereMd5(s.secret),
        ),
        return_url: returnUrl,
        cancel_url: `${returnUrl}&cancelled=1`,
        notify_url: s.notify,
        first_name: billing.firstName,
        last_name: billing.lastName,
        email,
        phone: billing.phone,
        address: billing.address,
        city: billing.city,
        country: billing.country,
        items: `Hotel reservation ${bookingId}`,
      },
    };
  }

  verify(body: unknown): PayHereNotification {
    const s = this.settings();
    if (!body || typeof body !== 'object')
      throw new BadRequestException('Invalid PayHere notification.');
    const b = body as Record<string, unknown>;
    for (const key of [
      'merchant_id',
      'order_id',
      'payment_id',
      'payhere_amount',
      'payhere_currency',
      'status_code',
      'md5sig',
    ])
      if (typeof b[key] !== 'string')
        throw new BadRequestException('Invalid PayHere notification.');
    if (
      b.merchant_id !== s.merchantId ||
      b.payhere_currency !== 'LKR' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        b.order_id as string,
      ) ||
      !/^\d{1,32}$/.test(b.payment_id as string) ||
      !/^\d{1,12}\.\d{2}$/.test(b.payhere_amount as string) ||
      !['2', '0', '-1', '-2', '-3'].includes(b.status_code as string) ||
      !/^[0-9a-f]{32}$/i.test(b.md5sig as string)
    )
      throw new BadRequestException('Invalid PayHere notification.');
    const expected = payhereMd5(
      `${b.merchant_id}${b.order_id as string}${b.payhere_amount as string}${b.payhere_currency}${b.status_code as string}${payhereMd5(s.secret)}`,
    );
    if (
      !timingSafeEqual(
        Buffer.from(expected),
        Buffer.from((b.md5sig as string).toUpperCase()),
      )
    )
      throw new BadRequestException('Invalid PayHere signature.');
    return {
      orderId: b.order_id as string,
      paymentId: b.payment_id as string,
      amount: b.payhere_amount as string,
      status: b.status_code as string,
    };
  }

  async receipts(orderId: string): Promise<PayHereReceipt[]> {
    const s = this.settings();
    if (
      !this.token ||
      this.token.until <= Date.now() ||
      this.token.environment !== s.mode
    ) {
      const response = await fetch(`${s.base}/merchant/v1/oauth/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${s.appId}:${s.appSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok)
        throw new ServiceUnavailableException(
          'PayHere verification unavailable.',
        );
      const value: unknown = await response.json();
      const t = value as {
        access_token?: unknown;
        expires_in?: unknown;
        scope?: unknown;
      } | null;
      if (
        !t ||
        typeof t.access_token !== 'string' ||
        !t.access_token ||
        !Number.isInteger(t.expires_in) ||
        Number(t.expires_in) <= 0 ||
        (s.mode === 'sandbox'
          ? t.scope !== 'SANDBOX'
          : !['LIVE', 'PRODUCTION'].includes(String(t.scope)))
      )
        throw new ServiceUnavailableException(
          'Invalid PayHere authorization response.',
        );
      this.token = {
        value: t.access_token,
        until: Date.now() + Math.max(0, Number(t.expires_in) - 30) * 1000,
        environment: s.mode,
      };
    }
    const response = await fetch(
      `${s.base}/merchant/v1/payment/search?order_id=${encodeURIComponent(orderId)}`,
      {
        headers: {
          Authorization: `Bearer ${this.token.value}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (response.status === 401) this.token = null;
    if (!response.ok)
      throw new ServiceUnavailableException(
        'PayHere verification unavailable.',
      );
    const value: unknown = await response.json();
    const result = value as { status?: unknown; data?: unknown } | null;
    if (result?.status === -1 && result.data === null) return [];
    if (result?.status !== 1 || !Array.isArray(result.data))
      throw new ServiceUnavailableException(
        'Invalid PayHere payment response.',
      );
    return result.data.map((entry: unknown) => {
      const row = entry as Record<string, unknown> | null;
      if (
        !row ||
        row.order_id !== orderId ||
        row.currency !== 'LKR' ||
        ![
          'RECEIVED',
          'REFUND REQUESTED',
          'REFUND PROCESSING',
          'REFUNDED',
          'CHARGEBACKED',
        ].includes(String(row.status)) ||
        !['string', 'number'].includes(typeof row.payment_id) ||
        !/^\d{1,32}$/.test(String(row.payment_id)) ||
        (typeof row.payment_id === 'number' &&
          !Number.isSafeInteger(row.payment_id)) ||
        typeof row.amount !== 'number' ||
        !Number.isSafeInteger(Math.round(row.amount * 100)) ||
        row.amount <= 0 ||
        Math.abs(row.amount * 100 - Math.round(row.amount * 100)) > 0.00001
      )
        throw new ServiceUnavailableException(
          'Invalid PayHere payment record.',
        );
      return {
        orderId,
        paymentId: String(row.payment_id),
        amount: Math.round(row.amount * 100),
        status: String(row.status),
      };
    });
  }
}
