'use client';

import { useState, type FormEvent } from 'react';
import { validStay } from '@/features/rooms/availability';

export function StayPlanner({
  rooms = [],
}: {
  rooms?: { roomTypeId: string; typeName: string }[];
}) {
  const [message, setMessage] = useState('');
  const [checkIn, setCheckIn] = useState('');
  function planStay(event: FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    if (
      !validStay(
        checkIn,
        String(form.get('checkOutDate')),
        Number(form.get('numberOfGuests')),
      )
    ) {
      event.preventDefault();
      setMessage(
        'Choose valid check-in and check-out dates, 1–90 nights apart.',
      );
      return;
    }
  }
  return (
    <section
      className="stay-planner"
      id="plan-stay"
      aria-label="Plan your stay"
    >
      <form action="/rooms" method="get" onSubmit={planStay}>
        <label>
          Check-in
          <input
            type="date"
            name="checkInDate"
            required
            value={checkIn}
            onChange={(event) => setCheckIn(event.target.value)}
          />
        </label>
        <label>
          Check-out
          <input
            type="date"
            name="checkOutDate"
            required
            min={checkIn || undefined}
          />
        </label>
        <label>
          Guests
          <select name="numberOfGuests">
            <option value="1">1 Guest</option>
            <option value="2">2 Guests</option>
            <option value="3">3 Guests</option>
            <option value="4">4 Guests</option>
          </select>
        </label>
        <label>
          Room type
          <select name="roomTypeId">
            <option value="">Any room</option>
            {rooms.map((room) => (
              <option key={room.roomTypeId} value={room.roomTypeId}>
                {room.typeName}
              </option>
            ))}{' '}
          </select>
        </label>
        <button className="button button-gold" type="submit">
          Explore availability
        </button>
      </form>
      <p className="planner-status" role="status">
        {message ||
          'Choose dates to check live availability. Searching does not reserve a room.'}
      </p>
    </section>
  );
}
