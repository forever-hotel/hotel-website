'use client';

import { useEffect, useRef, useState } from 'react';
import type { RoomType } from '../catalogue';
import {
  availabilityCount,
  hotelMonth,
  monthDates,
  validStay,
} from '../availability';
import { RoomComparison } from './room-comparison';
import { bookingUrl } from '../../booking/booking';
import styles from '../rooms.module.css';

type Search = {
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: string;
  roomTypeId: string;
};

export function AvailabilitySearch({
  rooms,
  initial,
  booking = false,
}: {
  rooms: RoomType[];
  initial: Search;
  booking?: boolean;
}) {
  const [search, setSearch] = useState(initial);
  const [submitted, setSubmitted] = useState<Search | null>(
    validStay(
      initial.checkInDate,
      initial.checkOutDate,
      Number(initial.numberOfGuests),
    )
      ? initial
      : null,
  );
  const [sort, setSort] = useState('price');
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    counts: Record<string, number | null>;
  } | null>(null);
  const [error, setError] = useState(
    (initial.checkInDate || initial.checkOutDate) &&
      !validStay(
        initial.checkInDate,
        initial.checkOutDate,
        Number(initial.numberOfGuests),
      )
      ? 'Choose valid dates, 1–90 nights apart, and a positive whole guest count.'
      : '',
  );
  const [calendarVersion, setCalendarVersion] = useState(0);
  const key = submitted ? JSON.stringify(submitted) + retry : '';
  const filtered = rooms.filter(
    (room) => !search.roomTypeId || room.roomTypeId === search.roomTypeId,
  );

  useEffect(() => {
    if (!submitted) return;
    const controller = new AbortController();
    const chosen = rooms.filter(
      (room) =>
        !submitted.roomTypeId || room.roomTypeId === submitted.roomTypeId,
    );
    Promise.all(
      chosen.map(async (room): Promise<[string, number | null]> => {
        if (room.maxGuests < Number(submitted.numberOfGuests))
          return [room.roomTypeId, 0];
        try {
          const response = await fetch(
            `/api/availability?${new URLSearchParams({ ...submitted, roomTypeId: room.roomTypeId })}`,
            { signal: controller.signal, cache: 'no-store' },
          );
          if (!response.ok) throw new Error('Unavailable');
          return [room.roomTypeId, availabilityCount(await response.json())];
        } catch {
          return [room.roomTypeId, null];
        }
      }),
    ).then((entries) => {
      if (!controller.signal.aborted)
        setResult({ key, counts: Object.fromEntries(entries) });
    });
    return () => controller.abort();
  }, [submitted, rooms, key]);

  function edit(name: keyof Search, value: string) {
    setCalendarVersion((value) => value + 1);
    setSearch((previous) => ({ ...previous, [name]: value }));
    setSubmitted(null);
    setError('');
  }
  const counts = submitted && result?.key === key ? result.counts : undefined;
  const display = [...filtered].sort((a, b) =>
    sort === 'availability'
      ? (counts?.[b.roomTypeId] ?? -1) - (counts?.[a.roomTypeId] ?? -1)
      : a.pricePerNight - b.pricePerNight,
  );
  const labels = Object.fromEntries(
    display.map((room) => [
      room.roomTypeId,
      !submitted
        ? 'Availability: check dates'
        : !counts
          ? 'Checking availability…'
          : counts[room.roomTypeId] === null
            ? 'Availability unknown — retry search'
            : `${counts[room.roomTypeId]} rooms available for your stay${room.maxGuests < Number(search.numberOfGuests) ? ' — guest count exceeds capacity' : ''}`,
    ]),
  );

  return (
    <>
      <form
        className={styles.searchForm}
        onSubmit={(event) => {
          event.preventDefault();
          if (
            !validStay(
              search.checkInDate,
              search.checkOutDate,
              Number(search.numberOfGuests),
            )
          ) {
            setError(
              'Choose valid dates, 1–90 nights apart, and a positive whole guest count.',
            );
            return;
          }
          setSubmitted({ ...search });
          setRetry((value) => value + 1);
          setError('');
          window.history.replaceState(
            null,
            '',
            booking
              ? `/booking?${new URLSearchParams({ ...search, step: 'select' })}`
              : `/rooms?${new URLSearchParams(search)}`,
          );
        }}
      >
        <label>
          Room type
          <select
            value={search.roomTypeId}
            onChange={(event) => edit('roomTypeId', event.target.value)}
          >
            <option value="">All rooms</option>
            {rooms.map((room) => (
              <option key={room.roomTypeId} value={room.roomTypeId}>
                {room.typeName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Check-in
          <input
            type="date"
            required
            value={search.checkInDate}
            onChange={(event) => edit('checkInDate', event.target.value)}
          />
        </label>
        <label>
          Check-out
          <input
            type="date"
            required
            min={search.checkInDate || undefined}
            value={search.checkOutDate}
            onChange={(event) => edit('checkOutDate', event.target.value)}
          />
        </label>
        <label>
          Guests
          <input
            type="number"
            min="1"
            step="1"
            required
            value={search.numberOfGuests}
            onChange={(event) => edit('numberOfGuests', event.target.value)}
          />
        </label>
        <button className="button button-gold">Search availability</button>
        <label>
          Sort by
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="price">Price: low to high</option>
            <option value="availability">Available room count</option>
          </select>
        </label>
      </form>
      {error && <p role="alert">{error}</p>}
      <p className={styles.resultCount}>
        {display.length} room {display.length === 1 ? 'type' : 'types'}
      </p>
      <p role="status">
        {!submitted
          ? 'Choose dates and search to check live availability.'
          : !counts
            ? 'Checking availability…'
            : `${display.filter((room) => (counts[room.roomTypeId] ?? 0) > 0).length} room types confirmed available for your stay.${Object.values(counts).some((value) => value === null) ? ' Some results are unknown.' : ''}`}
      </p>
      {counts && Object.values(counts).some((value) => value === null) && (
        <p role="alert">
          Some availability could not be checked.{' '}
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            Retry availability
          </button>
        </p>
      )}
      {counts && Object.values(counts).every((value) => value === 0) && (
        <p>No rooms match this stay. Try different dates or fewer guests.</p>
      )}
      <p>
        Availability is checked in Asia/Colombo hotel dates. Results do not
        reserve a room.
      </p>
      {search.roomTypeId &&
        rooms.some(
          (room) =>
            room.roomTypeId === search.roomTypeId &&
            room.maxGuests < Number(search.numberOfGuests),
        ) && (
          <p role="status">
            This room type cannot accommodate the selected guest count. Choose
            fewer guests or another room type.
          </p>
        )}
      {search.roomTypeId &&
        !rooms.some(
          (room) =>
            room.roomTypeId === search.roomTypeId &&
            room.maxGuests < Number(search.numberOfGuests),
        ) && (
          <AvailabilityCalendar
            key={`${search.roomTypeId}:${calendarVersion}`}
            roomTypeId={search.roomTypeId}
            search={search}
            onDates={(from, to) => {
              setSearch((previous) => ({
                ...previous,
                checkInDate: from,
                checkOutDate: to,
              }));
              setSubmitted(null);
            }}
          />
        )}
      {!search.roomTypeId && (
        <p>Select a room type to view its availability calendar.</p>
      )}
      <RoomComparison
        key={display
          .map((room) => room.roomTypeId)
          .sort()
          .join(',')}
        rooms={display}
        availability={labels}
        bookingLinks={
          submitted && counts
            ? Object.fromEntries(
                display
                  .filter((room) => (counts[room.roomTypeId] ?? 0) > 0)
                  .map((room) => [
                    room.roomTypeId,
                    bookingUrl({
                      ...submitted,
                      roomTypeId: room.roomTypeId,
                      numberOfGuests: Number(submitted.numberOfGuests),
                    }),
                  ]),
              )
            : undefined
        }
      />
    </>
  );
}

function AvailabilityCalendar({
  roomTypeId,
  search,
  onDates,
}: {
  roomTypeId: string;
  search: Search;
  onDates: (from: string, to: string) => void;
}) {
  const [month, setMonth] = useState(
    monthDates(search.checkInDate.slice(0, 7)).length
      ? search.checkInDate.slice(0, 7)
      : hotelMonth(),
  );
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    counts: Record<string, number>;
  } | null>(null);
  const [failed, setFailed] = useState('');
  const [anchor, setAnchor] = useState('');
  const [message, setMessage] = useState('');
  const grid = useRef<HTMLDivElement>(null);
  const dates = monthDates(month);
  const calendarKey = month + anchor + attempt;
  useEffect(() => {
    const controller = new AbortController();
    const days = monthDates(month);
    const to = new Date(Date.parse(days[days.length - 1]) + 86400000)
      .toISOString()
      .slice(0, 10);
    fetch(
      `/api/availability?${new URLSearchParams({ calendar: '1', roomTypeId, from: anchor && anchor < days[0] ? anchor : days[0], to })}`,
      { signal: controller.signal, cache: 'no-store' },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error('Unavailable');
        const data: unknown = await response.json();
        if (
          !data ||
          typeof data !== 'object' ||
          !('days' in data) ||
          !Array.isArray(data.days)
        )
          throw new Error('Invalid calendar');
        const counts: Record<string, number> = {};
        for (const entry of data.days) {
          if (
            !entry ||
            typeof entry !== 'object' ||
            !('date' in entry) ||
            typeof entry.date !== 'string'
          )
            throw new Error('Invalid day');
          counts[entry.date] = availabilityCount(entry);
        }
        if (days.some((date) => counts[date] === undefined))
          throw new Error('Incomplete calendar');
        if (!controller.signal.aborted) {
          setResult({ key: calendarKey, counts });
          setFailed('');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(month);
      });
    return () => controller.abort();
  }, [month, roomTypeId, attempt, anchor, calendarKey]);
  const counts =
    result?.key === calendarKey && failed !== month ? result.counts : undefined;
  function navigate(offset: number) {
    const date = new Date(`${month}-01T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + offset);
    setMonth(date.toISOString().slice(0, 7));
    if (
      anchor &&
      Math.abs(
        Date.parse(date.toISOString().slice(0, 10)) - Date.parse(anchor),
      ) >
        58 * 86400000
    )
      setAnchor('');
    setMessage('');
  }
  return (
    <section
      className={styles.calendar}
      aria-label="Room availability calendar"
    >
      <div className={styles.calendarHeading}>
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => navigate(-1)}
        >
          ←
        </button>
        <h3>
          {new Intl.DateTimeFormat('en', {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          }).format(new Date(`${month}-01T00:00:00Z`))}
        </h3>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => navigate(1)}
        >
          →
        </button>
      </div>
      <p>
        Select check-in, then checkout. Booked dates can be checkout boundaries.
        Use arrow keys to move between dates.
      </p>
      <p role="status">
        {failed === month
          ? 'Calendar unavailable.'
          : !counts
            ? 'Loading calendar…'
            : message ||
              (anchor
                ? 'Choose your checkout date.'
                : 'Choose your check-in date.')}
      </p>
      {failed === month && (
        <button
          type="button"
          onClick={() => {
            setFailed('');
            setResult(null);
            setAttempt((value) => value + 1);
          }}
        >
          Retry calendar
        </button>
      )}
      <div
        className={styles.calendarGrid}
        ref={grid}
        onKeyDown={(event) => {
          const offset = (
            {
              ArrowRight: 1,
              ArrowLeft: -1,
              ArrowDown: 7,
              ArrowUp: -7,
            } as Record<string, number>
          )[event.key];
          if (!offset) return;
          const buttons = Array.from(
            grid.current?.querySelectorAll('button') || [],
          );
          const index = buttons.indexOf(event.target as HTMLButtonElement);
          if (index >= 0) {
            event.preventDefault();
            buttons[
              Math.max(0, Math.min(buttons.length - 1, index + offset))
            ]?.focus();
          }
        }}
      >
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <span key={day} aria-hidden="true">
            {day}
          </span>
        ))}
        {Array.from(
          { length: (new Date(`${month}-01T00:00:00Z`).getUTCDay() + 6) % 7 },
          (_, index) => (
            <span key={`blank-${index}`} aria-hidden="true" />
          ),
        )}
        {dates.map((date) => {
          const count = counts?.[date];
          const blocked = count === 0;
          const selected =
            date >= search.checkInDate && date < search.checkOutDate;
          return (
            <button
              type="button"
              key={date}
              disabled={!counts}
              aria-disabled={blocked && !anchor}
              aria-pressed={selected || date === anchor}
              data-blocked={blocked}
              aria-label={`${date}, ${count === undefined ? 'availability unknown' : `${count} rooms available`}${date === search.checkOutDate ? ', checkout' : ''}`}
              onClick={() => {
                if (count === undefined) return;
                if (!anchor) {
                  if (blocked) {
                    setMessage(
                      'This night is blocked. Choose an available check-in date.',
                    );
                    return;
                  }
                  setAnchor(date);
                  onDates(date, '');
                  return;
                }
                if (date <= anchor) {
                  if (!blocked) {
                    setAnchor(date);
                    onDates(date, '');
                  } else setMessage('Choose an available check-in date.');
                  return;
                }
                if (
                  !validStay(anchor, date, Number(search.numberOfGuests)) ||
                  Object.keys(counts || {}).some(
                    (night) =>
                      night >= anchor && night < date && counts?.[night] === 0,
                  )
                ) {
                  setMessage(
                    'The range includes a blocked night or is invalid. Choose different dates.',
                  );
                  return;
                }
                onDates(anchor, date);
                setAnchor('');
                setMessage(
                  'Dates selected. Search to verify continuous-stay availability.',
                );
              }}
            >
              {Number(date.slice(-2))}
              {blocked && <small>Booked</small>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
