import styles from './booking.module.css';
export function GuestInformation({
  guest,
  confirmation,
  requests,
  errors,
  fresh,
  pending,
  onConfirmation,
  onRequests,
  onContinue,
}: {
  guest: { fullName: string; email: string };
  confirmation: string;
  requests: string;
  errors: { email?: string; requests?: string };
  fresh: boolean;
  pending: boolean;
  onConfirmation: (value: string) => void;
  onRequests: (value: string) => void;
  onContinue: () => void;
}) {
  return (
    <>
      <h2>Guest information</h2>
      <p>
        Your booking uses your signed-in guest account. Contact the hotel if
        your account details need correcting.
      </p>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onContinue();
        }}
      >
        <label>
          Guest name
          <input value={guest.fullName} readOnly autoComplete="name" />
        </label>
        <label>
          Account email
          <input
            value={guest.email}
            readOnly
            type="email"
            autoComplete="email"
          />
        </label>
        <label>
          Confirm email
          <input
            type="email"
            value={confirmation}
            onChange={(event) => {
              onConfirmation(event.target.value);
            }}
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'confirmation-error' : undefined}
            required
          />
        </label>
        {errors.email && (
          <p id="confirmation-error" role="alert" className={styles.error}>
            {errors.email}
          </p>
        )}
        <label>
          Special requests (optional)
          <textarea
            value={requests}
            maxLength={300}
            rows={4}
            onChange={(event) => {
              onRequests(event.target.value);
            }}
            aria-invalid={Boolean(errors.requests)}
            aria-describedby="requests-help requests-error"
          />
        </label>
        <p id="requests-help">
          Up to 300 characters. Requests are subject to hotel approval.
        </p>
        <p
          id="requests-error"
          role={errors.requests ? 'alert' : undefined}
          className={styles.error}
        >
          {errors.requests}
        </p>
        <button className="button button-gold" disabled={!fresh || pending}>
          Review payment handoff
        </button>
      </form>
    </>
  );
}
