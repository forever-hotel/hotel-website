'use client';

import { useEffect, useState } from 'react';

export function CookieNotice() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem('hotel-cookie-choice')) {
        // Read after hydration so server and client output remain consistent.
        const timer = window.setTimeout(() => setVisible(true), 0);
        return () => window.clearTimeout(timer);
      }
    } catch {
      // Storage restrictions do not prevent use of the page.
    }
  }, []);

  function choose(value: 'accepted' | 'declined') {
    try {
      localStorage.setItem('hotel-cookie-choice', value);
    } catch {
      /* Session dismissal still works. */
    }
    setVisible(false);
  }

  if (!visible) return null;
  return (
    <aside className="cookie-notice" aria-label="Cookie preferences">
      <p>
        We use essential storage to remember your preference. Optional analytics
        are currently disabled.
      </p>
      <div>
        <button
          className="button button-gold"
          onClick={() => choose('accepted')}
        >
          Accept all
        </button>
        <button
          className="button button-outline"
          onClick={() => choose('declined')}
        >
          Decline
        </button>
      </div>
    </aside>
  );
}
