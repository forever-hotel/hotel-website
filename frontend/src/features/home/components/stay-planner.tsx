'use client';

import { useState, type FormEvent } from 'react';

export function StayPlanner() {
  const [message, setMessage] = useState('');
  const [checkIn, setCheckIn] = useState('');
  function planStay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (String(form.get('checkOut')) <= checkIn) {
      setMessage('Please choose a check-out date after your check-in date.');
      return;
    }
    setMessage(
      'Explore the room previews below. Live availability and booking are not available yet.',
    );
    document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' });
  }
  return (
    <section
      className="stay-planner"
      id="plan-stay"
      aria-label="Plan your stay"
    >
      <form onSubmit={planStay}>
        <label>
          Check-in
          <input
            type="date"
            name="checkIn"
            required
            value={checkIn}
            onChange={(event) => setCheckIn(event.target.value)}
          />
        </label>
        <label>
          Check-out
          <input
            type="date"
            name="checkOut"
            required
            min={checkIn || undefined}
          />
        </label>
        <label>
          Guests
          <select name="guests">
            <option>1 Adult</option>
            <option>2 Adults</option>
            <option>3 Adults</option>
            <option>4 Adults</option>
          </select>
        </label>
        <label>
          Room type
          <select name="roomType">
            <option>Any Room</option> <option>Deluxe Room</option>
            <option>Junior Suite</option>
            <option>Presidential Suite</option>
          </select>
        </label>
        <button className="button button-gold" type="submit">
          Explore availability
        </button>
      </form>
      <p className="planner-status" role="status">
        {message || 'Plan your visit. Live availability is coming soon.'}
      </p>
    </section>
  );
}
