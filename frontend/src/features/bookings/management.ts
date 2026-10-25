import { isBookingId } from './dashboard.ts';
import { validStay } from '../rooms/availability.ts';

export type ChangeInput = {
  roomTypeId: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  specialRequests: string;
};
export type ManagementState = ChangeInput & {
  bookingId: string;
  status: string;
  currency: string | null;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  refundAmount: number;
  refundStatus: 'PENDING' | 'REFUNDED' | null;
  revision: number;
  eligible: boolean;
  reason: string;
  cutoff?: string;
  checkInTime?: string;
};
export type ChangeQuote = ChangeInput & {
  bookingId: string;
  quoteId: string;
  quoteToken: string;
  currency: 'LKR';
  totalAmount: number;
  subtotal: number;
  additionalCharges: number;
  nights: number;
  paidAmount: number;
  balanceAmount: number;
  refundAmount: number;
  revision: number;
  expiresAt: string;
  settlementMode: string;
};
export type MutationResult = {
  booking: ManagementState;
  operationId: string;
  emailStatus: string;
  replayed: boolean;
};
export type Failure = {
  error: string;
  kind: 'auth' | 'conflict' | 'unavailable' | 'invalid' | 'uncertain';
};
export type Result<T> =
  { value: T; error?: never; kind?: never } | (Failure & { value?: never });
const statuses = [
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'CHECKED_IN',
  'CHECKED_OUT',
];
const emailStates = [
  'PENDING',
  'SENDING',
  'ACCEPTED',
  'SANDBOX',
  'FAILED',
  'UNKNOWN',
];
const amount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid management response');
  return value as Record<string, unknown>;
}
export function changeInput(value: unknown): ChangeInput {
  const row = object(value);
  if (
    typeof row.roomTypeId !== 'string' ||
    !isBookingId(row.roomTypeId) ||
    typeof row.checkInDate !== 'string' ||
    typeof row.checkOutDate !== 'string' ||
    typeof row.numberOfGuests !== 'number' ||
    !validStay(row.checkInDate, row.checkOutDate, row.numberOfGuests) ||
    typeof row.specialRequests !== 'string' ||
    row.specialRequests.length > 300 ||
    /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(row.specialRequests)
  )
    throw new Error(
      'Choose valid dates, room, guests and plain-text requests (up to 300 characters).',
    );
  return {
    roomTypeId: row.roomTypeId,
    checkInDate: row.checkInDate,
    checkOutDate: row.checkOutDate,
    numberOfGuests: row.numberOfGuests,
    specialRequests: row.specialRequests.trim(),
  };
}
function summary(value: unknown, id: string): ManagementState {
  const row = object(value);
  // Existing requests are displayed as escaped text; old records need not match new input validation.
  if (
    row.bookingId !== id ||
    !isBookingId(id) ||
    typeof row.roomTypeId !== 'string' ||
    !isBookingId(row.roomTypeId) ||
    !statuses.includes(row.status as string) ||
    typeof row.checkInDate !== 'string' ||
    typeof row.checkOutDate !== 'string' ||
    typeof row.numberOfGuests !== 'number' ||
    !validStay(row.checkInDate, row.checkOutDate, row.numberOfGuests) ||
    !(
      row.specialRequests === null || typeof row.specialRequests === 'string'
    ) ||
    !(
      row.currency === null ||
      (typeof row.currency === 'string' && /^[A-Z]{3}$/.test(row.currency))
    ) ||
    ![
      row.totalAmount,
      row.paidAmount,
      row.balanceAmount,
      row.refundAmount,
      row.revision,
    ].every(amount) ||
    ![null, 'PENDING', 'REFUNDED'].includes(
      row.refundStatus as null | string,
    ) ||
    row.balanceAmount !==
      (row.status === 'CANCELLED'
        ? 0
        : Math.max(0, Number(row.totalAmount) - Number(row.paidAmount))) ||
    row.refundAmount !==
      Math.max(
        0,
        Number(row.paidAmount) -
          (row.status === 'CANCELLED' ? 0 : Number(row.totalAmount)),
      )
  )
    throw new Error('Invalid booking management state');
  return {
    bookingId: id,
    roomTypeId: row.roomTypeId,
    status: row.status as string,
    checkInDate: row.checkInDate,
    checkOutDate: row.checkOutDate,
    numberOfGuests: row.numberOfGuests,
    specialRequests: row.specialRequests || '',
    currency: row.currency as string | null,
    totalAmount: Number(row.totalAmount),
    paidAmount: Number(row.paidAmount),
    balanceAmount: Number(row.balanceAmount),
    refundAmount: Number(row.refundAmount),
    refundStatus: row.refundStatus as ManagementState['refundStatus'],
    revision: Number(row.revision),
    eligible: false,
    reason: '',
  };
}
const reasons: Record<string, string> = {
  CHANGE_CUTOFF_PASSED:
    'The 24-hour deadline for online changes and cancellation has passed. Contact the hotel.',
  BOOKING_NOT_ELIGIBLE:
    'This reservation cannot be changed or cancelled online in its current state. Contact the hotel.',
  SETTLEMENT_REVIEW_REQUIRED:
    'Staff must resolve the outstanding payment or refund review before another change.',
  MANAGEMENT_POLICY_UNAVAILABLE:
    'Online booking management is temporarily unavailable. Contact the hotel.',
  ROOM_UNAVAILABLE:
    'The requested room is no longer available for these dates. Choose another room or stay.',
  PRICE_CHANGE_REQUIRES_STAFF:
    'This price change must be arranged with the hotel.',
  CHANGE_QUOTE_STALE:
    'Your booking or hotel policy changed. Refresh and request a new preview.',
  BOOKING_CHANGED:
    'Your booking changed. Refresh and review it before trying again.',
  IDEMPOTENCY_CONFLICT:
    'This request conflicts with an earlier attempt. Review your current booking before continuing.',
};
export function managementReason(value: unknown): string {
  const row =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  return (
    reasons[String(row.error)] ||
    'This booking cannot be managed online right now. Contact the hotel.'
  );
}
export function parseManagement(value: unknown, id: string): ManagementState {
  const row = object(value);
  const state = summary(row, id);
  if (typeof row.eligible !== 'boolean') throw new Error('Invalid eligibility');
  if (!row.eligible) return { ...state, reason: managementReason(row.reason) };
  if (
    state.status !== 'CONFIRMED' ||
    state.currency !== 'LKR' ||
    row.timeZone !== 'Asia/Colombo' ||
    typeof row.cutoff !== 'string' ||
    !Number.isFinite(Date.parse(row.cutoff)) ||
    typeof row.checkInTime !== 'string' ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.checkInTime) ||
    !['MANUAL_REVIEW', 'SAME_TOTAL_ONLY'].includes(
      row.modificationSettlement as string,
    ) ||
    row.cancellationRefund !== 'FULL_MANUAL_REVIEW'
  )
    throw new Error('Invalid booking policy');
  return {
    ...state,
    eligible: true,
    cutoff: row.cutoff,
    checkInTime: row.checkInTime,
  };
}
export function parseChangeQuote(
  value: unknown,
  id: string,
  input: ChangeInput,
): ChangeQuote {
  const row = object(value);
  const stay = changeInput(row);
  if (
    row.bookingId !== id ||
    !isBookingId(id) ||
    typeof row.quoteId !== 'string' ||
    !isBookingId(row.quoteId) ||
    typeof row.quoteToken !== 'string' ||
    row.quoteToken.length > 16000 ||
    !/^[\w-]+\.[\w-]+$/.test(row.quoteToken) ||
    JSON.stringify(stay) !== JSON.stringify(changeInput(input)) ||
    row.currency !== 'LKR' ||
    ![
      row.totalAmount,
      row.subtotal,
      row.additionalCharges,
      row.paidAmount,
      row.balanceAmount,
      row.refundAmount,
      row.revision,
    ].every(amount) ||
    Number(row.totalAmount) < 1 ||
    row.totalAmount !== Number(row.subtotal) + Number(row.additionalCharges) ||
    row.nights !==
      (Date.parse(stay.checkOutDate) - Date.parse(stay.checkInDate)) /
        86400000 ||
    row.balanceAmount !==
      Math.max(0, Number(row.totalAmount) - Number(row.paidAmount)) ||
    row.refundAmount !==
      Math.max(0, Number(row.paidAmount) - Number(row.totalAmount)) ||
    typeof row.expiresAt !== 'string' ||
    !Number.isFinite(Date.parse(row.expiresAt)) ||
    !['MANUAL_REVIEW', 'SAME_TOTAL_ONLY'].includes(row.settlementMode as string)
  )
    throw new Error('Invalid change quote');
  return {
    ...stay,
    bookingId: id,
    quoteId: row.quoteId,
    quoteToken: row.quoteToken,
    currency: 'LKR',
    totalAmount: Number(row.totalAmount),
    subtotal: Number(row.subtotal),
    additionalCharges: Number(row.additionalCharges),
    nights: Number(row.nights),
    paidAmount: Number(row.paidAmount),
    balanceAmount: Number(row.balanceAmount),
    refundAmount: Number(row.refundAmount),
    revision: Number(row.revision),
    expiresAt: row.expiresAt,
    settlementMode: row.settlementMode as string,
  };
}
export function parseMutation(
  value: unknown,
  id: string,
  kind: 'MODIFIED' | 'CANCELLED',
): MutationResult {
  const row = object(value);
  const booking = summary(row, id);
  const operation = object(row.operation);
  if (
    typeof operation.id !== 'string' ||
    !isBookingId(operation.id) ||
    operation.kind !== kind ||
    !emailStates.includes(operation.emailStatus as string) ||
    typeof row.replayed !== 'boolean' ||
    booking.revision < 1
  )
    throw new Error('Mutation was not verified');
  return {
    booking,
    operationId: operation.id,
    emailStatus: operation.emailStatus as string,
    replayed: row.replayed,
  };
}
export function changeEmailMessage(state: string): string {
  if (state === 'SANDBOX')
    return 'Update email validated in sandbox. No email was delivered.';
  if (state === 'ACCEPTED')
    return 'Update email accepted by the email provider. Inbox delivery is not verified.';
  if (state === 'FAILED')
    return 'The update was saved, but its email could not be sent.';
  return 'The update was saved. Email processing is not yet verified.';
}
export function cutoffLabel(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Colombo',
  }).format(new Date(value));
}
