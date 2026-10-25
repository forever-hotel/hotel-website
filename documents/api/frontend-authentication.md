# Frontend guest authentication (DDP-#20)

Implemented routes: `/sign-up`, `/sign-in` and a minimal protected `/profile`.
The guest icon links to Profile; unauthenticated visitors are redirected to
Sign In. This profile verifies identity and provides sign-out; it is not the
later booking-management dashboard.

## Gateway and session behavior

Next.js Server Actions call the existing gateway endpoints:

- `POST /hw/guests/register`: first/last names become `fullName`; only fullName,
  email and password are sent. Confirmation is validated in the frontend server
  action. A 201 account response redirects to Sign In, without creating a session.
- `POST /hw/guests/login`: email/password return the existing JWT contract.
- `GET /hw/guests/me`: Profile forwards the cookie token as an Authorization
  bearer header on the server and trusts identity only after backend validation.

The frontend sets a host-only `hw_guest_session` cookie, HttpOnly, SameSite=Lax,
Path=/ and Secure in production, with lifetime capped at 24 hours and the
backend's `expiresIn`. Production requires HTTPS (localhost browser exceptions
are for local testing). This is a frontend BFF cookie, not the gateway's
`hw_session` cookie: it is never forwarded as a Cookie header to the gateway.
No token or password is stored in localStorage/sessionStorage or returned as
client action state. Profile reads use no-store; authentication has bounded
upstream timeouts. Next.js Server Actions enforce the framework's same-origin
POST protections. Configure any production reverse proxy according to the
actual trusted deployment; no wildcard allowedOrigins are added here.

Sign-out deletes the frontend cookie. The existing stateless JWT backend has no
token revocation endpoint: sign-out does not revoke a separately stolen token.
A backend 401 redirects to Sign In with an expiry message. A backend outage
renders a retry state without deleting the session. The HttpOnly cookie cannot
be changed from a Server Component; expired/invalid cookies are replaced at
next login or removed by sign-out.

Return destinations are canonical same-origin allowlisted paths: `/`, `/rooms`,
`/profile`, `/booking` and `/booking/confirmation`. Safe search parameters survive
cross-links and registration/login. External URLs, protocol-relative paths,
backslashes, controls and unapproved paths fall back to `/profile`. Booking
paths are reserved for subsequent tickets; the remaining booking screens are
not implemented by this change.

## Validation and release decisions

Live Neon inspection found no unique email index and one group of existing
duplicate normalized emails. The backend now serializes registrations by
normalized email with a transaction-scoped advisory lock, then checks
`lower(btrim(email))` before insertion. This protects writers using this service;
other subsystem/direct SQL writers still require Infra's database unique index.
No persistent schema or existing account rows were changed. Authentication rejects
ambiguous duplicate-email matches until the data owner reviews those records.
Verification includes a temporary-table integration test without a unique email
index and an existing Neon email checked inside a read-only transaction.

Names follow the existing Unicode name rules and 255-character combined limit.
Passwords require 8 characters for registration and at most 72 UTF-8 bytes;
login does not impose a new minimum on existing accounts. Password confirmation
is required for registration. Duplicate-email, invalid credentials, validation,
rate-limit and network failures produce safe messages; upstream error bodies
and credentials are not logged or reflected to the browser.

Form errors appear in a red, focusable alert. Required-field and browser-format
validation are surfaced inline through the same alert. A headless Chrome check
verified the computed red color and focus for empty fields, duplicate-email
registration and invalid credentials, alongside the existing authentication flow.

The split-photo forms adapt the supplied screen catalogue and reuse a local
AI-enhanced image. Google/Facebook and password-recovery services are absent,
so the forms explain their unavailability and provide no false-success buttons.
Unapproved loyalty/discount/member-benefit claims are omitted.

Approved legal content and consent policy were not supplied. No invented terms,
privacy page or consent acceptance is presented or recorded. Registration can
be exercised against development accounts; approving and publishing the legal
content and any required consent collection is a release prerequisite. Team
approval of the BFF cookie/session arrangement also remains pending; this
implementation does not claim the outstanding DDP-#06 decisions are signed off.
No environment files, gateway routes or backend schema were changed.

## Validation evidence

Production build, lint, type checks, 21 focused unit tests and the HTTP smoke
test passed. A local headless Chrome fixture verified first/last-name mapping,
confirmation mismatch, duplicate email, registration without automatic login,
401 errors, safe stay returns, HttpOnly/Secure/SameSite cookie attributes, no
browser token storage, profile identity checks, expired sessions, sign-out,
external return rejection, service outages and 375px layout. No real guest
accounts were created by these fixture checks. Live gateway/account testing,
legal approval, CI and peer review remain with the release workflow.
