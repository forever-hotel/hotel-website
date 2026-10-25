# Forever Hotel frontend

Next.js App Router guest website with TypeScript and plain CSS. Start with the
[fresh-checkout guide](../documents/release/setup.md) for the backend, disposable
database and separate API Gateway. The [screen catalogue](SCREEN_CATALOGUE.md)
preserves the supplied design; [release traceability](../documents/release/traceability.md)
records current implementation and deferred decisions.

## Run locally

Use Node 22.14+. Run `npm ci`, copy `.env.example` to `.env.local` if needed,
set `API_GATEWAY_URL=http://localhost:8080`, then run `npm run dev`. Visit
`http://localhost:3001`. Frontend server requests use gateway `/hw`; never put
backend secrets in `NEXT_PUBLIC_*` or configure a direct subsystem backend URL.

Without upstream services, public hotel content renders with honest unavailable
states. Physical room rows are required for availability; catalogue types alone
are insufficient. Missing provider configuration disables payment.

## Current guest journey

Home contains hotel background, policies, previews, FAQ and the stay planner;
there is no separate About page. Rooms uses API catalogue/availability, compares
up to three types, and provides an accessible calendar. Services and Contact show
facility/location information and enquiries. Offers lists active codes; online
discount redemption remains unavailable.

Guests register, then sign in separately. The session uses an HttpOnly cookie;
server requests forward bearer credentials. Profile now lists upcoming, past and
cancelled bookings, owned details and eligible change/cancel controls.

Booking has four screens and five progress milestones, with Payment represented
separately. Quotes create no holds. Supported configuration is one room with
capacity-checked guests and special requests; multi-room, add-ons and child-specific
pricing are not implemented.

New checkout uses **PayHere**, full payment only, with callback verification and
Retrieval corroboration. Stripe guides describe legacy attempts. Brevo sends
confirmation/change email independently of payment success; sandbox sends no
inbox email. Cancellation records staff refund work, not a completed provider refund.

## Verify

```powershell
npm run build
npm run lint
npm run format:check
npm run typecheck
npm test
npm run test:coverage
npm run test:e2e
npm run test:quality
```

Browser checks require a production build and Chrome/Edge, and use isolated API
fixtures with mocked provider settlement. Quality mode checks 320/768/1440px,
keyboard flows and axe rules. See [visitor E2E](../documents/testing/visitor-booking-e2e.md),
[quality checks](../documents/testing/responsive-accessibility.md) and
[HTTP contracts](../documents/testing/booking-contracts.md). Fixture results are
not live inventory/provider or staging evidence.

## Assets and deferred controls

Room photos come from the API; static banner/facility substitutes are documented
in [asset provenance](public/images/README.md). Generated and enhanced images
retain visible labels. Exact original assets/fonts/mobile frames and final
content/legal approval remain tracked in the release matrix.

Local `/images/` assets are supported. Remote images require HTTPS and exact
approved hostnames in `ROOM_IMAGE_HOSTS`; no scheme, wildcard or port. Rebuild
after changes. Containers also need the allowlist at build time; see
[staging setup](../deploy/staging/README.md).

Social sign-in, password recovery, newsletter subscriptions, loyalty balances,
online promo redemption, add-ons, automatic refunds and PDF downloads remain
deferred/unavailable. Browser printing is supported. Do not present these as
shipped capabilities or replace API rooms with sample cards.

## Further reading

- [Current API guides and examples](../documents/release/api.md)
- [Requirement and screen evidence](../documents/release/traceability.md)
- [Demo and test checklist](../documents/release/demo.md)
- [PayHere configuration](../documents/api/payhere-checkout.md)
- [Guest bookings](../documents/api/guest-bookings.md)
- [Booking management](../documents/api/booking-management.md)
- [Staging release/rollback](../deploy/staging/README.md)
- [Frontend conventions](FRONTEND_STRUCTURE.md)

Staging URL is not supplied. Historical API/design drafts are references, not
proof that unresolved service contracts or release approvals passed.
