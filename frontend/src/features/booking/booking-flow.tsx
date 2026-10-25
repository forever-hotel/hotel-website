'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { RoomType } from '../rooms/catalogue';
import { AvailabilitySearch } from '../rooms/components/availability-search';
import { requestQuote } from './actions';
import { bookingUrl, guestErrors, hotelToday, stayError } from './booking';
import type { Quote, Stay } from './booking';
import styles from './booking.module.css';
import { BookingSummary } from './booking-summary';
import { RoomConfiguration } from './room-configuration';
import { GuestInformation } from './guest-information';
import { PaymentStep } from './payment-step';

const milestones = [
  'Select Room',
  'Room Details',
  'Guest Info',
  'Payment',
  'Confirmation',
];

export function BookingFlow({
  rooms,
  guest,
}: {
  rooms: RoomType[];
  guest: { fullName: string; email: string };
}) {
  const params = useSearchParams();
  const router = useRouter();
  const stay: Stay = {
    roomTypeId: params.get('roomTypeId') || '',
    checkInDate: params.get('checkInDate') || '',
    checkOutDate: params.get('checkOutDate') || '',
    numberOfGuests: Number(params.get('numberOfGuests') || '1'),
  };
  const room = rooms.find((item) => item.roomTypeId === stay.roomTypeId);
  const requested = params.get('step');
  const step =
    !room || requested === 'select'
      ? 'select'
      : requested === 'guest'
        ? 'guest'
        : requested === 'payment'
          ? 'payment'
          : 'details';
  const milestone = ['select', 'details', 'guest', 'payment'].indexOf(step);
  const key = JSON.stringify(stay);
  const currentKey = useRef(key + step);
  useEffect(() => {
    currentKey.current = key + step;
  }, [key, step]);
  const [preview, setPreview] = useState<{ key: string; quote: Quote } | null>(
    null,
  );
  const [error, setError] = useState('');
  const [signIn, setSignIn] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [requests, setRequests] = useState('');
  const [errors, setErrors] = useState<{ email?: string; requests?: string }>(
    {},
  );
  const [reviewed, setReviewed] = useState('');
  const [dirtyKey, setDirtyKey] = useState('');
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const title = useRef<HTMLHeadingElement>(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    title.current?.focus();
  }, [step]);
  const quote = preview?.key === key ? preview.quote : null;
  const fresh = quote && Date.parse(quote.expiresAt) > now;
  const guestValid =
    Object.keys(guestErrors(guest.email, confirmation, requests)).length === 0;
  const handoffReady = fresh && reviewed === quote.quoteId && guestValid;

  function navigate(next: string, nextStay = stay) {
    setDirtyKey('');
    setError('');
    setSignIn(false);
    router.push(bookingUrl(nextStay, next));
  }

  function loadQuote() {
    if (busy.current || !room) return;
    if (dirtyKey === key) {
      setError(
        'Apply your edited dates and guest count using Update stay and recheck first.',
      );
      return;
    }
    const invalid = stayError(stay, room.maxGuests);
    if (invalid) {
      setError(invalid);
      return;
    }
    busy.current = true;
    setError('');
    setSignIn(false);
    setPreview(null);
    setReviewed('');
    startTransition(async () => {
      try {
        const result = await requestQuote(stay);
        if (currentKey.current !== key + step) return;
        if (result.quote) {
          setPreview({ key, quote: result.quote });
          setNow(Date.now());
          if (step === 'details') navigate('guest');
        } else {
          setError(result.error);
          setSignIn(Boolean(result.signIn));
        }
      } catch {
        setError(
          'The quote could not be loaded. Please retry; your selections are kept.',
        );
      } finally {
        busy.current = false;
      }
    });
  }

  return (
    <>
      <nav className={styles.progress} aria-label="Booking progress">
        <ol>
          {milestones.map((label, index) => (
            <li
              key={label}
              aria-current={index === milestone ? 'step' : undefined}
            >
              <span>{index < milestone ? '✓' : index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      </nav>
      <header className={styles.heading}>
        <p className="eyebrow">Your stay at Forever City Hotel</p>
        <h1 ref={title} tabIndex={-1}>
          {milestones[milestone]}
        </h1>
        <p>
          Hotel dates use Asia/Colombo time. Selecting a room or requesting a
          quote does not reserve it.
        </p>
      </header>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {signIn && (
        <Link
          href={`/sign-in?returnTo=${encodeURIComponent(bookingUrl(stay, step))}`}
        >
          Sign in again
        </Link>
      )}
      {step === 'select' ? (
        <AvailabilitySearch
          booking
          rooms={rooms}
          initial={{ ...stay, numberOfGuests: String(stay.numberOfGuests) }}
        />
      ) : (
        room && (
          <>
            <form
              key={key}
              className={styles.dates}
              onChange={() => {
                setPreview(null);
                setReviewed('');
                setDirtyKey(key);
              }}
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                setPreview(null);
                setReviewed('');
                navigate('details', {
                  ...stay,
                  checkInDate: String(data.get('checkInDate')),
                  checkOutDate: String(data.get('checkOutDate')),
                  numberOfGuests: Number(data.get('numberOfGuests')),
                });
              }}
            >
              <label>
                Check-in
                <input
                  name="checkInDate"
                  disabled={pending}
                  type="date"
                  required
                  min={hotelToday()}
                  defaultValue={stay.checkInDate}
                />
              </label>
              <label>
                Check-out
                <input
                  name="checkOutDate"
                  disabled={pending}
                  type="date"
                  required
                  min={stay.checkInDate || hotelToday()}
                  defaultValue={stay.checkOutDate}
                />
              </label>
              <label>
                Guests
                <input
                  name="numberOfGuests"
                  disabled={pending}
                  type="number"
                  min="1"
                  max={room.maxGuests}
                  step="1"
                  required
                  defaultValue={stay.numberOfGuests}
                />
              </label>
              <button className="button button-outline" disabled={pending}>
                Update stay and recheck
              </button>
            </form>
            <div className={styles.columns}>
              <section
                className={styles.panel}
                aria-label={milestones[milestone]}
              >
                {step === 'details' ? (
                  <RoomConfiguration
                    rooms={rooms}
                    selectedId={room.roomTypeId}
                    pending={pending}
                    onSelect={(roomTypeId) =>
                      navigate('details', { ...stay, roomTypeId })
                    }
                    onContinue={loadQuote}
                  />
                ) : step === 'guest' ? (
                  <GuestInformation
                    guest={guest}
                    confirmation={confirmation}
                    requests={requests}
                    errors={errors}
                    fresh={Boolean(fresh)}
                    pending={pending}
                    onConfirmation={(value) => {
                      setConfirmation(value);
                      setReviewed('');
                    }}
                    onRequests={(value) => {
                      setRequests(value);
                      setReviewed('');
                    }}
                    onContinue={() => {
                      const validation = guestErrors(
                        guest.email,
                        confirmation,
                        requests,
                      );
                      setErrors(validation);
                      if (Object.keys(validation).length) return;
                      if (!fresh || !quote) {
                        setError('Request a fresh quote before continuing.');
                        return;
                      }
                      setReviewed(quote.quoteId);
                      navigate('payment');
                    }}
                  />
                ) : (
                  <>
                    <h2>
                      {handoffReady
                        ? 'Ready for payment'
                        : 'Review your stay before payment'}
                    </h2>
                    {handoffReady ? (
                      <>
                        <p>Guest: {guest.fullName}</p>
                        <p>Email: {guest.email}</p>
                        {requests && <p>Special requests: {requests}</p>}
                        <p>Quote reference: {quote.quoteId}</p>
                        <p>
                          Your price preview expires at{' '}
                          {new Date(quote.expiresAt).toLocaleTimeString(
                            'en-LK',
                            { timeZone: 'Asia/Colombo' },
                          )}{' '}
                          (Asia/Colombo).
                        </p>
                        <PaymentStep quote={quote} requests={requests} />
                        <Link href="/contact">
                          Contact the hotel for assistance
                        </Link>
                      </>
                    ) : (
                      <p>
                        Return to Guest Info to confirm your email and review a
                        current quote. Refreshing this page requires a new
                        review.
                      </p>
                    )}
                    <button
                      type="button"
                      className="button button-outline"
                      onClick={() => navigate('guest')}
                    >
                      Back to Guest Info
                    </button>
                  </>
                )}
              </section>
              <BookingSummary
                room={room}
                stay={stay}
                quote={quote}
                fresh={Boolean(fresh)}
                pending={pending}
                step={step}
                onRefresh={loadQuote}
                onNavigate={navigate}
              />
            </div>
          </>
        )
      )}
    </>
  );
}
