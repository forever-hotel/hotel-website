# Guest and payment security review (DDP-#33)

## Run the checks

From `backend`:

```powershell
npm run test:security
node node_modules/jest/bin/jest.js --runInBand
npm run build
npm run lint
npm run format:check
```

From `frontend`, run `npm test`. From the separate `api-gateway` repository,
run `npm test` for routing, authentication forwarding and rate-limit checks.

The security command runs the HTTP consumer-contract suite, including its
security scenarios. It requires the normal backend database configuration and
the team schema with `DB_SYNCHRONIZE=false`. All writes use temporary table
copies on one dedicated connection and roll back. Payment Retrieval and email
delivery are mocked; no real charge, refund or email occurs. The consumer check
spawns Node, so the environment must permit child processes. CI already runs
this file as part of backend integration tests.

## Findings and fixes

Verification on 2026-10-25: all 6 HTTP scenarios, 431 backend unit tests
(with coverage), 51 frontend tests and 20 gateway tests passed. Backend build,
lint and formatting checks passed. These results use the synthetic fixtures
described above; staging deployment checks remain outstanding.

- The global exception filter previously logged raw exception stacks. Database
  and provider error messages may contain private parameters. It now logs only
  `{ event: 'request_failed', status }`. A regression test inserts password,
  card and provider-secret canaries into the message, name, stack and SQL
  parameters and checks that they are absent from logs and responses.
- Production now refuses `DB_LOGGING=true`. TypeORM query/error logging can
  include bound authentication and billing parameters. Keep it disabled on any
  environment containing real guest data. Development logging remains an
  explicit option for synthetic data only.

## Acceptance evidence

| Boundary                         | Automated evidence                                                                                                                                                                                                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guest ownership                  | HTTP suite: foreign Profile/detail/status/management reads and modification/cancellation/payment-resume attempts cannot access another guest's booking; recovery returns `bookingId: null`; foreign requests never call Retrieval.                                    |
| Authentication                   | HTTP suite rejects missing and invalid bearer tokens; JWT/guard unit tests cover signature tampering, expiry, malformed tokens and claim validation. Browser UI never supplies authoritative guest identity.                                                          |
| Request validation               | HTTP suite rejects a submitted guest ID, client prices, unsupported promo/quantity/add-on fields, SQL syntax in UUID/email fields, HTML in special requests and newline injection in enquiry names.                                                                   |
| Payment authority                | Signed callbacks require Retrieval corroboration. Invalid signatures and unverified callbacks leave the booking pending and unpaid. Repeated valid callbacks produce one confirmation email; replayed cancellation keeps the same outcome.                            |
| Stored payment data              | HTTP suite rejects nested card number/CVV/expiry fields at checkout, ignores extra sensitive callback fields, examines persisted snapshots for canaries, and verifies stored passwords are bcrypt hashes. Status responses exclude internal payment/billing metadata. |
| Enquiry abuse                    | HTTP suite varies spoofed forwarded IP headers and still reaches 429; unit tests check per-connection limits and expiry. Failed email delivery never claims acceptance.                                                                                               |
| Untrusted images and return URLs | Frontend room/auth tests reject external redirects, traversal, credentials, non-HTTPS and unapproved image hosts. Payment tests restrict provider destinations and reject redirect-only success.                                                                      |
| Browser persistence              | Source review: the session is an HttpOnly, SameSite=Lax cookie, Secure in production. Application local storage contains only the cookie-notice choice; booking credentials and card data are not stored there.                                                       |

Guest-facing strings render through React escaping; there is no
`dangerouslySetInnerHTML` in application source. Contact messages are sent as
plain text. Social sign-in and password recovery are unavailable rather than
alternate authentication paths. Card-brand artwork does not collect payment
details; checkout hands off to the configured provider. The booking document
is the owned status/print view, with no separate public document endpoint.

## Deployment checks and limits

This is an application review with synthetic provider responses, not a live
provider test or an independent penetration test. Before release, infra must
verify HTTPS, certificate validity, private upstream access and distributed
gateway rate limits in staging. Backend contact throttling is a local backstop
based on the socket IP; behind a proxy it can share a quota across guests.

JWTs expire after 24 hours and logout clears the browser cookie; it does not
revoke a previously copied bearer token. Central revocation needs a separate
session design. Cancellation records staff refund work; these tests do not
claim an actual provider refund. Dependency scanning, staging TLS and live
provider verification are separate checks and are not implied by a passing
local suite.
