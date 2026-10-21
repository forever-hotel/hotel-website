'use client';

import { useRef, useState, type FormEvent } from 'react';
import { submitEnquiry } from '@/lib/api/contact-client';
import styles from '../contact.module.css';

export function ContactForm() {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [accepted, setAccepted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const phone = String(data.get('phone') || '').trim();
    inFlight.current = true;
    setPending(true);
    setNotice('');
    try {
      const result = await submitEnquiry({
        name: String(data.get('name') || '').trim(),
        email: String(data.get('email') || '').trim(),
        ...(phone ? { phone } : {}),
        subject: String(data.get('subject') || ''),
        message: String(data.get('message') || '').trim(),
      });
      setAccepted(result.accepted);
      setNotice(result.message);
      if (result.accepted) form.reset();
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} aria-busy={pending}>
      <div className={styles.fields}>
        <label>
          Full name
          <input
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={100}
          />
        </label>
        <label>
          Email address
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
        <label>
          Phone <span>(optional)</span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={25}
            pattern="[+0-9 \(\)\-]{7,25}"
          />
        </label>
        <label>
          Subject
          <select name="subject" defaultValue="" required>
            <option value="" disabled>
              Select a subject
            </option>
            <option>General enquiry</option>
            <option>Rooms and stays</option>
            <option>Events</option>
            <option>Other</option>
          </select>
        </label>
      </div>
      <label>
        Message
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={3000}
          rows={6}
        />
      </label>
      <div className={styles.submitRow}>
        <button type="submit" className="button button-blue" disabled={pending}>
          {pending ? 'Submitting…' : 'Send message'}
        </button>
        <p>
          Your contact details are used to respond to this enquiry. Please do
          not include card details or other sensitive information.
        </p>
      </div>
      {notice && (
        <p className={styles.notice} role={accepted ? 'status' : 'alert'}>
          {notice}
        </p>
      )}
    </form>
  );
}
