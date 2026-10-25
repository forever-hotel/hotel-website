import { validStay } from '../rooms/availability.ts';
export type PaymentOption = 'FULL' | 'DEPOSIT';
export type PaymentOptions = {
  available: boolean;
  depositPercent: number | null;
  checkoutMinutes: number | null;
  sandbox?: boolean;
};
export type BillingDetails = {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  country: string;
};
export type PayHereCheckout = {
  action: string;
  fields: Record<string, string>;
};
export function parsePayHereCheckout(value: unknown): PayHereCheckout {
  const checkout = value as PayHereCheckout | null;
  const required = [
    'merchant_id',
    'order_id',
    'amount',
    'currency',
    'hash',
    'return_url',
    'cancel_url',
    'notify_url',
    'first_name',
    'last_name',
    'email',
    'phone',
    'address',
    'city',
    'country',
    'items',
  ];
  if (
    !checkout ||
    ![
      'https://sandbox.payhere.lk/pay/checkout',
      'https://www.payhere.lk/pay/checkout',
    ].includes(checkout.action) ||
    !checkout.fields ||
    typeof checkout.fields !== 'object' ||
    Object.keys(checkout.fields).length !== required.length ||
    !required.every(
      (key) =>
        typeof checkout.fields[key] === 'string' && checkout.fields[key].trim(),
    ) ||
    checkout.fields.currency !== 'LKR' ||
    !/^\d+\.\d{2}$/.test(checkout.fields.amount) ||
    !/^[A-F0-9]{32}$/.test(checkout.fields.hash) ||
    !validBookingId(checkout.fields.order_id)
  )
    throw new Error('Invalid PayHere checkout');
  return checkout;
}
export type PaymentStatus = {
  bookingId: string;
  status: string;
  roomType: string;
  guestName?: string;
  guestEmail?: string;
  roomImage?: string | null;
  specialRequests?: string | null;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  currency: 'LKR';
  paymentOption: PaymentOption | null;
  amountDue: number | null;
  paymentReference: string | null;
  holdExpiresAt: string | null;
  paymentState: string;
  refundStatus: string | null;
  verificationDelayed: boolean;
  emailStatus?: string;
  priceSnapshot: {
    nights: number;
    nightlyRate: number;
    subtotal: number;
    lineItems: { code: string; label: string; amount: number }[];
  };
};
export const validBookingId = (id: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export function safeStripeUrl(value: unknown): string | null {
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' &&
      url.hostname === 'checkout.stripe.com' &&
      !url.username &&
      !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
export function parsePaymentStatus(value: unknown, id: string): PaymentStatus {
  if (!value || typeof value !== 'object')
    throw new Error('Invalid booking status');
  const row = value as PaymentStatus;
  if (
    row.bookingId !== id ||
    !validBookingId(id) ||
    row.currency !== 'LKR' ||
    ![
      'PENDING',
      'CONFIRMED',
      'CANCELLED',
      'CHECKED_IN',
      'CHECKED_OUT',
      'NO_SHOW',
    ].includes(row.status) ||
    typeof row.roomType !== 'string' ||
    typeof row.checkInDate !== 'string' ||
    typeof row.checkOutDate !== 'string' ||
    !Number.isInteger(row.numberOfGuests) ||
    row.numberOfGuests < 1 ||
    ![row.totalAmount, row.paidAmount, row.balanceAmount].every(
      (n) => Number.isSafeInteger(n) && n >= 0,
    ) ||
    row.balanceAmount !==
      (row.status === 'CANCELLED' || row.paymentState === 'EXPIRED'
        ? 0
        : Math.max(0, row.totalAmount - row.paidAmount)) ||
    !validStay(row.checkInDate, row.checkOutDate, row.numberOfGuests) ||
    !row.priceSnapshot ||
    !Number.isInteger(row.priceSnapshot.nights) ||
    row.priceSnapshot.nights < 1 ||
    row.priceSnapshot.nights !==
      (Date.parse(row.checkOutDate) - Date.parse(row.checkInDate)) / 86400000 ||
    !Number.isSafeInteger(row.priceSnapshot.nightlyRate) ||
    !Number.isSafeInteger(row.priceSnapshot.subtotal) ||
    row.priceSnapshot.nightlyRate <= 0 ||
    row.priceSnapshot.nightlyRate * row.priceSnapshot.nights !==
      row.priceSnapshot.subtotal ||
    !Array.isArray(row.priceSnapshot.lineItems) ||
    !row.priceSnapshot.lineItems.every(
      (line) =>
        line &&
        typeof line.code === 'string' &&
        typeof line.label === 'string' &&
        Number.isSafeInteger(line.amount) &&
        line.amount >= 0,
    ) ||
    row.priceSnapshot.subtotal +
      row.priceSnapshot.lineItems.reduce(
        (sum, line) => sum + line.amount,
        0,
      ) !==
      row.totalAmount
  )
    throw new Error('Invalid booking status');
  return row;
}
export function paymentHeading(status: PaymentStatus): string {
  if (status.paymentState === 'REVIEW_REQUIRED')
    return 'Payment requires hotel review';
  if (status.refundStatus === 'REFUNDED') return 'Payment refunded';
  if (status.refundStatus === 'PENDING')
    return 'Payment received — refund pending';
  if (
    ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].includes(status.status) &&
    status.paidAmount > 0
  )
    return 'Your stay is confirmed';
  if (status.status === 'CANCELLED' || status.paymentState === 'EXPIRED')
    return 'Checkout cancelled or expired';
  return 'Payment confirmation pending';
}

export function confirmationEmailMessage(state: string | undefined): string {
  switch (state) {
    case 'ACCEPTED':
      return 'Confirmation email accepted by the email provider. Inbox delivery is not verified.';
    case 'SANDBOX':
      return 'Confirmation email validated in sandbox. No email was delivered.';
    case 'FAILED':
      return 'Confirmation email could not be sent. Your paid reservation remains valid; retry payment status later.';
    case 'SENDING':
    case 'UNKNOWN':
      return 'Confirmation email processing is unverified. Keep your booking reference; your paid reservation remains valid.';
    default:
      return 'No confirmation email has been recorded. Keep your booking reference.';
  }
}
