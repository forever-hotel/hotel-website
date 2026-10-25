'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { money, hotelToday } from '@/features/booking/booking';
import { changeEmailMessage, changeInput, cutoffLabel } from './management';
import type {
  ChangeQuote,
  ChangeInput,
  Failure,
  ManagementState,
  MutationResult,
  Result,
} from './management';
import {
  previewBookingChange,
  saveBookingManagement,
} from './management-actions';
import styles from './dashboard.module.css';

type RoomChoice = { roomTypeId: string; typeName: string; maxGuests: number };
type Attempt = Parameters<typeof saveBookingManagement>[1];

export function ManagementControls({
  id,
  initial,
  rooms,
}: {
  id: string;
  initial: Result<ManagementState>;
  rooms: RoomChoice[] | null;
}) {
  const router = useRouter();
  const state = initial.value;
  const [mode, setMode] = useState<'change' | 'cancel' | null>(null);
  const [quote, setQuote] = useState<ChangeQuote | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [outcome, setOutcome] = useState<MutationResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [uncertain, setUncertain] = useState(false);
  const attempt = useRef<Attempt | null>(null);
  const busy = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const alert = useRef<HTMLParagraphElement>(null);
  const success = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (mode && dialog.current && !dialog.current.open)
      dialog.current.showModal();
    if (!mode && dialog.current?.open) {
      dialog.current.close();
      if (
        trigger.current?.isConnected &&
        !trigger.current.hasAttribute('disabled')
      )
        trigger.current.focus();
      else heading.current?.focus();
    }
  }, [mode]);
  useEffect(() => {
    if (failure) alert.current?.focus();
  }, [failure]);
  useEffect(() => {
    if (outcome) success.current?.focus();
  }, [outcome]);
  useEffect(() => {
    if (mode === 'change' && quote) reviewHeading.current?.focus();
    else if (mode === 'change')
      form.current?.querySelector<HTMLSelectElement>('select')?.focus();
  }, [mode, quote]);

  function open(next: 'change' | 'cancel', target: HTMLElement) {
    if (busy.current || uncertain) return;
    trigger.current = target;
    setFailure(null);
    setOutcome(null);
    setQuote(null);
    attempt.current = null;
    setMode(next);
  }
  function close() {
    if (busy.current || uncertain) return;
    setMode(null);
    setQuote(null);
    setFailure(null);
    attempt.current = null;
  }
  function preview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const data = new FormData(event.currentTarget);
    let input: ChangeInput;
    try {
      input = changeInput({
        roomTypeId: String(data.get('roomTypeId')),
        checkInDate: String(data.get('checkInDate')),
        checkOutDate: String(data.get('checkOutDate')),
        numberOfGuests: Number(data.get('numberOfGuests')),
        specialRequests: String(data.get('specialRequests') || ''),
      });
      const selected = rooms?.find(
        (room) => room.roomTypeId === input.roomTypeId,
      );
      if (!selected || input.numberOfGuests > selected.maxGuests)
        throw new Error(
          'Choose a guest count within the selected room capacity.',
        );
    } catch {
      setFailure({
        kind: 'invalid',
        error:
          'Check your dates, room capacity and guest count. Requests must be plain text, up to 300 characters.',
      });
      return;
    }
    busy.current = true;
    setFailure(null);
    startTransition(async () => {
      try {
        const result = await previewBookingChange(id, input);
        if (result.value) {
          setQuote(result.value);
          attempt.current = null;
        } else setFailure(result);
      } catch {
        setFailure({
          kind: 'unavailable',
          error:
            'The preview could not be loaded. Your booking has not been changed.',
        });
      } finally {
        busy.current = false;
      }
    });
  }
  function submit() {
    if (busy.current || !state) return;
    if (!attempt.current) {
      if (mode === 'change' && quote) {
        if (Date.parse(quote.expiresAt) <= Date.now()) {
          setQuote(null);
          setFailure({
            kind: 'conflict',
            error: 'This preview expired. Request a fresh preview.',
          });
          return;
        }
        attempt.current = {
          kind: 'MODIFIED',
          quoteToken: quote.quoteToken,
          key: crypto.randomUUID(),
        };
      } else if (mode === 'cancel')
        attempt.current = {
          kind: 'CANCELLED',
          revision: state.revision,
          key: crypto.randomUUID(),
        };
      else return;
    }
    const request = attempt.current;
    busy.current = true;
    setFailure(null);
    startTransition(async () => {
      try {
        const result = await saveBookingManagement(id, request);
        if (result.value) {
          setOutcome(result.value);
          setMode(null);
          setQuote(null);
          setUncertain(false);
          attempt.current = null;
          router.refresh();
        } else {
          setFailure(result);
          setUncertain(result.kind === 'uncertain');
          if (result.kind !== 'uncertain') {
            attempt.current = null;
            if (result.kind === 'conflict') {
              setQuote(null);
              router.refresh();
            }
          }
        }
      } catch {
        setUncertain(true);
        setFailure({
          kind: 'uncertain',
          error:
            'The result could not be verified. Retry this same request before starting another change.',
        });
      } finally {
        busy.current = false;
      }
    });
  }
  const errorMessage = failure && (
    <p ref={alert} tabIndex={-1} role="alert" className={styles.error}>
      {failure.error}
      {failure.kind === 'auth' && (
        <>
          {' '}
          <Link
            href={`/sign-in?returnTo=${encodeURIComponent(`/profile/bookings/${id}`)}`}
          >
            Sign in again
          </Link>
          .
        </>
      )}
    </p>
  );
  const refreshing =
    !!outcome && (!state || state.revision < outcome.booking.revision);
  return (
    <section
      id="manage-booking"
      className={styles.management}
      aria-labelledby="management-heading"
    >
      <h2 id="management-heading" ref={heading} tabIndex={-1}>
        Manage your booking
      </h2>
      {outcome && (
        <div
          ref={success}
          tabIndex={-1}
          role="status"
          className={styles.notice}
        >
          <p>
            {outcome.booking.status === 'CANCELLED'
              ? 'Your booking is cancelled.'
              : 'Your booking change has been verified.'}
          </p>
          <p>{changeEmailMessage(outcome.emailStatus)}</p>
          {outcome.booking.refundAmount > 0 && (
            <p>
              Refund awaiting staff processing:{' '}
              {money(outcome.booking.refundAmount)}. No refund has been issued
              by this request.
            </p>
          )}
          {outcome.booking.balanceAmount > 0 && (
            <p>
              Balance to arrange with the hotel:{' '}
              {money(outcome.booking.balanceAmount)}.
            </p>
          )}
          {refreshing && <p>Refreshing the saved booking details…</p>}
        </div>
      )}
      {!mode && errorMessage}
      {!state ? (
        <p role="alert">
          {initial.error}{' '}
          {initial.kind === 'auth' && (
            <Link
              href={`/sign-in?returnTo=${encodeURIComponent(`/profile/bookings/${id}`)}`}
            >
              Sign in again
            </Link>
          )}
          <button
            type="button"
            className="button button-outline"
            disabled={pending}
            onClick={() => startTransition(() => router.refresh())}
          >
            Refresh management options
          </button>
        </p>
      ) : (
        <>
          {state.currency === 'LKR' && (
            <dl className={styles.financials}>
              <div>
                <dt>Paid</dt>
                <dd>{money(state.paidAmount)}</dd>
              </div>
              <div>
                <dt>Balance</dt>
                <dd>{money(state.balanceAmount)}</dd>
              </div>
              {state.refundAmount > 0 && (
                <div>
                  <dt>Refund awaiting staff processing</dt>
                  <dd>{money(state.refundAmount)}</dd>
                </div>
              )}
              {state.refundStatus === 'REFUNDED' && (
                <div>
                  <dt>Refund status</dt>
                  <dd>Refund recorded</dd>
                </div>
              )}
            </dl>
          )}
          {state.eligible ? (
            <>
              <p>
                Online changes and cancellation close on{' '}
                <strong>{cutoffLabel(state.cutoff!)} (Sri Lanka time)</strong>,
                24 hours before check-in at {state.checkInTime}.
              </p>
              <div className={styles.managementButtons}>
                <button
                  type="button"
                  className="button button-blue"
                  disabled={pending || refreshing || !rooms?.length}
                  onClick={(event) => open('change', event.currentTarget)}
                >
                  Change booking
                </button>
                <button
                  type="button"
                  className="button button-outline"
                  disabled={pending || refreshing}
                  onClick={(event) => open('cancel', event.currentTarget)}
                >
                  Cancel booking
                </button>
              </div>
              {!rooms?.length && (
                <p>
                  Room choices could not be loaded. Refresh this page to change
                  your stay. Cancellation remains available.
                </p>
              )}
            </>
          ) : (
            <p>{state.reason}</p>
          )}
        </>
      )}
      <dialog
        ref={dialog}
        className={styles.managementDialog}
        aria-labelledby="management-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        <h2 id="management-dialog-title" ref={reviewHeading} tabIndex={-1}>
          {mode === 'cancel'
            ? 'Review cancellation'
            : quote
              ? 'Review your booking change'
              : 'Change your stay'}
        </h2>
        {mode && errorMessage}
        {pending && (
          <p role="status">
            {quote || mode === 'cancel'
              ? 'Verifying your request…'
              : 'Checking availability and price…'}
          </p>
        )}
        {mode === 'change' && (
          <>
            <form
              ref={form}
              onSubmit={preview}
              hidden={!!quote || uncertain}
              className={styles.managementForm}
            >
              <fieldset disabled={pending}>
                <legend>Choose your new stay</legend>
                <label>
                  Room type
                  <select
                    name="roomTypeId"
                    defaultValue={state?.roomTypeId}
                    required
                  >
                    {!rooms?.some(
                      (room) => room.roomTypeId === state?.roomTypeId,
                    ) && <option value="">Choose a room</option>}
                    {rooms?.map((room) => (
                      <option key={room.roomTypeId} value={room.roomTypeId}>
                        {room.typeName} · up to {room.maxGuests} guests
                      </option>
                    ))}
                  </select>
                </label>
                <div className={styles.fieldRow}>
                  <label>
                    Check-in
                    <input
                      type="date"
                      name="checkInDate"
                      defaultValue={state?.checkInDate}
                      min={hotelToday()}
                      required
                    />
                  </label>
                  <label>
                    Check-out
                    <input
                      type="date"
                      name="checkOutDate"
                      defaultValue={state?.checkOutDate}
                      min={hotelToday()}
                      required
                    />
                  </label>
                </div>
                <label>
                  Guests
                  <input
                    type="number"
                    name="numberOfGuests"
                    min="1"
                    step="1"
                    defaultValue={state?.numberOfGuests}
                    required
                  />
                </label>
                <label>
                  Special requests
                  <textarea
                    name="specialRequests"
                    maxLength={300}
                    defaultValue={state?.specialRequests}
                    rows={3}
                  />
                </label>
                <p>
                  Requests are subject to availability. Your booking stays
                  unchanged until you review and save a preview.
                </p>
                <button className="button button-blue" type="submit">
                  Preview changes
                </button>
              </fieldset>
            </form>
            {quote && (
              <div className={styles.changeReview}>
                <p>
                  {rooms?.find((room) => room.roomTypeId === quote.roomTypeId)
                    ?.typeName || 'Selected room'}
                </p>
                <p>
                  {quote.checkInDate} to {quote.checkOutDate} ·{' '}
                  {quote.numberOfGuests} guests · {quote.nights} nights
                </p>
                <dl className={styles.financials}>
                  <div>
                    <dt>Current total</dt>
                    <dd>{money(state?.totalAmount || 0)}</dd>
                  </div>
                  <div>
                    <dt>New total</dt>
                    <dd>{money(quote.totalAmount)}</dd>
                  </div>
                  <div>
                    <dt>Already paid</dt>
                    <dd>{money(quote.paidAmount)}</dd>
                  </div>
                </dl>
                {quote.balanceAmount > 0 && (
                  <p>
                    Extra payment for staff to arrange:{' '}
                    <strong>{money(quote.balanceAmount)}</strong>. Saving this
                    change does not charge your card.
                  </p>
                )}
                {quote.refundAmount > 0 && (
                  <p>
                    Refund for staff review:{' '}
                    <strong>{money(quote.refundAmount)}</strong>. Saving this
                    change does not issue a refund.
                  </p>
                )}
                <p className={styles.requests}>
                  Special requests: {quote.specialRequests || 'None'}
                </p>
                <p>
                  Preview expires {cutoffLabel(quote.expiresAt)} (Sri Lanka
                  time). Availability will be checked again when you save.
                </p>
                {!uncertain && (
                  <div className={styles.managementButtons}>
                    <button
                      className="button button-blue"
                      type="button"
                      disabled={pending}
                      onClick={submit}
                    >
                      Confirm booking change
                    </button>
                    <button
                      className="button button-outline"
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setQuote(null);
                        setFailure(null);
                        attempt.current = null;
                      }}
                    >
                      Edit selection
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        {mode === 'cancel' && state && (
          <div className={styles.changeReview}>
            <p>
              Cancel your reservation for {state.checkInDate} to{' '}
              {state.checkOutDate}? This releases its room availability.
            </p>
            <p>
              Cancellation fee under the current policy:{' '}
              <strong>{money(0)}</strong>.
            </p>
            <p>
              Full refund for staff processing:{' '}
              <strong>{money(state.paidAmount)}</strong>. The refund is not
              automatic. Staff must arrange the return of your money.
            </p>
            {!uncertain && (
              <div className={styles.managementButtons}>
                <button
                  type="button"
                  className="button button-blue"
                  disabled={pending}
                  onClick={submit}
                >
                  Confirm cancellation
                </button>
                <button
                  type="button"
                  className="button button-outline"
                  disabled={pending}
                  onClick={close}
                  autoFocus
                >
                  Keep booking
                </button>
              </div>
            )}
          </div>
        )}
        {uncertain ? (
          <button
            type="button"
            className="button button-blue"
            disabled={pending}
            onClick={submit}
          >
            Retry same request
          </button>
        ) : (
          mode === 'change' && (
            <button
              type="button"
              className="button button-outline"
              disabled={pending}
              onClick={close}
            >
              Close without changes
            </button>
          )
        )}
      </dialog>
    </section>
  );
}
