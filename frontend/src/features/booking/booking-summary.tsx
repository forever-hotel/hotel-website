import type { RoomType } from '../rooms/catalogue';
import { RoomImage } from '../rooms/components/room-image';
import { money } from './booking';
import type { Quote, Stay } from './booking';
import styles from './booking.module.css';
export function BookingSummary({
  room,
  stay,
  quote,
  fresh,
  pending,
  step,
  onRefresh,
  onNavigate,
  promoCode,
  onPromoCode,
}: {
  room: RoomType;
  stay: Stay;
  quote: Quote | null;
  fresh: boolean;
  pending: boolean;
  step: string;
  onRefresh: () => void;
  onNavigate: (step: string) => void;
  promoCode: string;
  onPromoCode: (code: string) => void;
}) {
  return (
    <aside className={styles.summary} aria-label="Room and price summary">
      <RoomImage source={room.imageUrls[0]} name={room.typeName} />
      <h2>{room.typeName}</h2>
      <form
        className={styles.promoForm}
        onSubmit={(event) => {
          event.preventDefault();
          onRefresh();
        }}
      >
        <label htmlFor="booking-promo-code">Promotion code (optional)</label>
        <input
          id="booking-promo-code"
          value={promoCode}
          maxLength={50}
          pattern="[A-Za-z0-9_-]+"
          disabled={pending}
          onChange={(event) => onPromoCode(event.target.value)}
          autoComplete="off"
        />
        <button
          className="button button-outline"
          disabled={pending || !promoCode.trim()}
        >
          {pending ? 'Checking…' : 'Apply code'}
        </button>
        {promoCode && (
          <button
            type="button"
            className="button button-outline"
            disabled={pending}
            onClick={() => onPromoCode('')}
          >
            Remove code
          </button>
        )}
      </form>
      <p>
        {stay.checkInDate} → {stay.checkOutDate}
      </p>
      <p>
        1 room · {stay.numberOfGuests}{' '}
        {stay.numberOfGuests === 1 ? 'guest' : 'guests'}
      </p>
      {quote ? (
        <>
          <p>
            {quote.nights} nights × {money(quote.nightlyRate)}
          </p>
          <dl>
            <dt>Room subtotal</dt>
            <dd>{money(quote.subtotal)}</dd>
            {quote.promotion && (
              <div>
                <dt>Promotion ({quote.promotion.code})</dt>
                <dd>−{money(quote.discountAmount || 0)}</dd>
              </div>
            )}
            {quote.lineItems.map((line) => (
              <div key={line.code}>
                <dt>{line.label}</dt>
                <dd>{money(line.amount)}</dd>
              </div>
            ))}
            <dt>Total</dt>
            <dd>
              <strong>{money(quote.totalAmount)}</strong>
            </dd>
          </dl>
          <p>
            {quote.rateBasis === 'INCLUSIVE'
              ? 'Catalogue rate includes applicable charges.'
              : 'Additional charges are listed above.'}
          </p>
        </>
      ) : (
        <p>Request a quote to see the current total and applicable charges.</p>
      )}
      {quote && !fresh && (
        <p role="alert" className={styles.error}>
          Your quote has expired. Refresh it to continue.
        </p>
      )}
      {step !== 'details' && !fresh && (
        <button
          type="button"
          className="button button-gold"
          disabled={pending}
          onClick={onRefresh}
        >
          {pending ? 'Checking…' : 'Refresh quote'}
        </button>
      )}
      <button
        type="button"
        className="button button-outline"
        disabled={pending}
        onClick={() => onNavigate('details')}
      >
        Change room or dates
      </button>
    </aside>
  );
}
