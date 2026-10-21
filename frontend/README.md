# Forever Hotel frontend

Next.js App Router application with TypeScript, ESLint, and Prettier. The home
page follows the supplied Grand Meridian screenshots as one scrolling page:
photo hero, stay planner, story, services, rooms, promotions, testimonial, FAQ,
and footer. It uses plain CSS, system fonts, and locally stored substitute photos;
no new dependencies are required.

Use [UI_GUIDE.md](UI_GUIDE.md) for the team's Figma reference, design inspection
status, and steps for building the hotel website UI. The screenshot composition
is implemented; exact Figma assets, fonts, hotel copy, and mobile frames still need
confirmation. Room cards now use catalogue API prices; the stay planner does not
yet check live inventory or create reservations.

## Rooms catalogue (DDP-#16)

`/rooms` follows the saved Rooms design and loads the public catalogue through
`GET /hw/room-types` at the configured API Gateway. Home uses the same loader
and card component for its first three room previews. There is no static-room
fallback and no direct frontend database access.

Set these in your local frontend environment (never copy backend secrets):

```dotenv
API_GATEWAY_URL=http://localhost:8080
ROOM_IMAGE_HOSTS=your-approved-image-host.example.com
```

The gateway must map the catalogue path to the Website backend's implemented
`GET /room-types`. This implementation consumes the actual DTO fields:
`roomTypeId`, `typeName`, nullable `description`, `pricePerNight` in LKR cents,
`currency`, `maxGuests`, `imageUrls` and `amenities`. It does not invent categories,
publication flags, discounts, badges or room inventory.

Room-type filtering is a normal GET form (`/rooms?roomTypeId=<uuid>`), so it works
without client-side filtering code. Cards expose full descriptions and amenities
through native expandable details. Invalid/unknown selections use the Rooms
not-found view; malformed catalogue data and network failure show an unavailable
state. A valid empty response shows an empty state. Home remains usable if room
requests fail. Enquire links to Contact; no room reservation is created.

Image policy is shared between the loader and `next.config.ts`. Local paths under
`/images/` are supported. External images require HTTPS and an exact approved
hostname in `ROOM_IMAGE_HOSTS` (comma-separated; no schemes, ports or wildcards).
Restart/rebuild after changing it. Unsafe/unapproved/missing image URLs are removed
and failed photos retain a readable placeholder. Pick the actual storage host used
by your database URLs. Original/AI-enhanced static imagery remains only for banners
and hotel story; room card photos now come from the API.

Comparison is explicitly unavailable until #18; date-scoped availability belongs
to #17/#19 and booking handoff to #23. Cards therefore say Check Dates instead of
asserting available/fully booked without a date query.

Verification: build, lint, type checks and 12 frontend tests passed. Catalogue,
image policy and other imported API logic reached 100% line/branch coverage;
JSX is checked separately through HTTP rendering. Real gateway/database-image
verification and browser layout/keyboard/failed-image checks remain pending.

## Contact and enquiries (DDP-#15)

Hotel website requests use the gateway `/hw` prefix, which the gateway removes
before forwarding to this backend. Guest endpoints are
`POST /hw/guests/register`, `POST /hw/guests/login`, and `GET /hw/guests/me`.
The profile endpoint requires the backend-issued bearer token. Frontend guest
authentication is not implemented yet. Promotions retain their separate draft
contract and are not served by the hotel website backend.

`/contact` follows the saved Contact screen: photo hero, Google map alongside an
accessible form, independently readable text address/directions, guest-relations
introduction and shared navigation/footer. Staff names, portraits and direct
contacts remain unfilled until confirmed. Home's FAQ stays on Home.

The browser submits to same-origin `/api/contact`, which uses server-only
`API_GATEWAY_URL` to reach the `/hw/contact/enquiries` gateway path.
It never calls a subsystem backend directly. Configure delivery only in the
backend after the hotel confirms its exact enquiry email and provider settings.
Missing/disabled settings return a clear failure rather than fake success.
Sandbox feedback explicitly says no email was sent; accepted feedback does not
claim inbox delivery. Inputs survive failure and repeated concurrent clicks are
blocked. The map need not load for the text address or form to work.

See [the contact contract](../documents/api/contact-enquiries.md) for setup,
validation, throttling, provider behaviour and remaining owner decisions.

## Services and Facilities (DDP-#14)

Image-quality update: missing facility images now use labelled AI-generated
illustrations. Room previews include an explicitly labelled AI-enhanced photograph;
original files are retained. The hero uses the larger actual pool photo instead
of the low-resolution night image. Active assets are locally stored WebP files;
see `public/images/README.md` for provenance.

`/services` follows the saved Services screenshot with a photo hero, introduction,
responsive facility cards, scenic-photo tile, and shared header/footer. Header,
footer and Home's View All Services action link to this route.

Facility content lives in `src/features/services/content.ts`; page-specific styles
use `services.module.css`. The small `FacilityImage` client component handles
missing/failed photos, while facility names and descriptions remain server-rendered.
Karaoke has a deliberate photo placeholder until an approved image is supplied.
Pool, dining and room photos now come from public Forever City Hotel listings;
source URLs are in `public/images/README.md`. Unverified facility photos use
placeholders rather than stock photos of other properties.

The restaurant retains the screenshot's WON name; confirm any WOK/WON discrepancy
with the hotel. No opening hours, prices, package inclusions or facility-booking
capabilities have been invented. The page links honeymoon packages to current
published offers and explains that online facility reservations are unavailable.
Descriptions are concise presentation copy and should be checked by the hotel.

HTTP tests cover the route, facility names, missing-photo state, offers link and
unavailable-reservation notice. Visual/mobile/keyboard and actual failed-image
browser checks remain pending.

## Hotel information and navigation (DDP-#13)

Shared header/footer components and public destinations live in
`src/components/layout/`. Until full pages are built, destinations use `/#...`
links to existing Home previews so they also resolve when components are reused
on another page. Update `navigation.ts` when an owning issue implements a full
route; Home story remains `/#our-hotel`, with no separate About Us page.

The user confirmed the supplied hotel details as real on 20 October 2026; see
the confirmation record in `UI_GUIDE.md`. Story statistics, location and the
testimonial no longer carry sample notices. `/#hotel-policies` presents the
confirmed 2 PM/noon check-in/out times, with package-specific terms left to the
selected rate. No additional cancellation rules or contact details are invented.
Contact/map work remains #15; live room data and booking remain later tickets.

The HTTP smoke test checks hotel/policy content, navigation targets, and that
no standalone `/about` route is introduced. Browser visual/keyboard verification
remain outstanding.

## Home page and promotions (DDP-#12)

The [screen catalogue](SCREEN_CATALOGUE.md) records all supplied website screens
and the booking flow for future implementation. It records the user's clarification
that About Us content belongs on Home, without a separate page.

The route stays in `src/app/page.tsx`; promotion validation and presentation live
in `src/features/promotions/`. Server-side gateway access lives in `src/lib/api/`.
The hotel copy is introductory content; confirm it with the hotel before release.

To enable offers, copy `.env.example` to `.env.local` and set `API_GATEWAY_URL`
to the API Gateway origin (without `/api/v1`). This is server-only configuration,
not a `NEXT_PUBLIC_*` value. Never use a subsystem backend URL here.

The integration consumes the documented P1 draft:
`GET /api/v1/promotions?limit=20`. That endpoint must return **published public
offers only**; its response has no publication flag for frontend verification.
The frontend additionally validates the response and shows only offers where
`validFrom <= now < validUntil`. This boundary convention needs confirmation
with Manager Dashboard because D5 remains pending. No private promotion fields
or endpoint are invented. Fixed discounts are LKR minor units; displayed expiry
times use Asia/Colombo. `FIXED` is the frontend's proposed fixed-discount enum;
P1 currently documents only `PERCENTAGE`, so confirm this value with the owner
before enabling fixed offers. Booking eligibility remains subject to validation.

Without configuration, or on timeout (3 seconds), HTTP failure, malformed data,
or an empty response, the offers section shows a neutral empty state. Suspense
allows hotel content to render while offers load. Requests are uncached so
deactivated or expired offers are not retained between page requests.

The gateway route and publication ownership still require cross-team approval;
live offers cannot be verified until the upstream service is available.

## Agreed frontend structure

Refer to the [team's frontend folder structure standard](FRONTEND_STRUCTURE.md)
when implementing or reorganizing the frontend. It preserves the supplied Word
document, including the common skeleton, hotel website routes and feature modules,
naming rules, and API, testing and deployment conventions.

The home page follows this structure with a small promotion feature module.
Start with sections 3–6 for this frontend and review section 26 for
decisions the source document still marks for team confirmation.

## Local setup

For Docker builds and local container health checks, see the
[container setup guide](../README.md#local-container-setup).

Before adding API integrations, review the
[hotel website API contract draft](../documents/api/hotel-website-contracts.md).
Its route paths and session contract remain subject to cross-team approval.

Install Node.js 22.14 or newer and npm. From the repository root:

```sh
cd frontend
npm ci
npm run dev
```

Open http://localhost:3001. Port 3001 leaves port 3000 available for the NestJS
backend. Stop the development server with Ctrl+C before starting production on
the same port. If the port is occupied, stop the other process or run
`npx next dev --port 3002`.

## Verification

Run from `frontend/`:

```sh
npm run lint
npm run format:check
npm run typecheck
npm run build
npm test
npm run test:coverage
npm start
```

The smoke test starts and stops its own production server on a temporary port.
It checks the home content, active and fixed-discount offers, exclusion of future
and expired offers, empty responses, upstream failure, and unknown-route 404.
It starts its own local mock gateway; no live service is required. Build before
running it. To smoke-test development startup in PowerShell:

```powershell
$env:SMOKE_MODE = 'dev'
npm test
Remove-Item Env:SMOKE_MODE
```

In Bash, use `SMOKE_MODE=dev npm test`. `npm start` serves the production build
at http://localhost:3001. `test:coverage` measures promotion filtering and gateway
logic using Node's built-in test runner and TypeScript stripping (Node 22.14+).
The HTTP smoke test separately exercises the server-rendered UI.

CI installs from the committed lockfile and runs lint, format, type, build, and
production smoke checks on pushes and PRs to `develop` or `pre-develop`.

## Conventions

- Keep application routes and layouts in `src/app/`; use `@/` for `src/` imports.
- TypeScript strict mode is enabled. Lint does not modify files.
- Use `npm run format` to apply single quotes and trailing commas consistently.
- Keep `.next/`, `node_modules/`, and generated TypeScript files out of Git.
  Next.js regenerates `next-env.d.ts` during dev, build, or type generation.
- Future browser API requests must use the agreed shared gateway contract.
  Never put secrets in client code or `NEXT_PUBLIC_*` variables.

## Issue 4 verification evidence

Local checks passed with Node.js 22.14.0 and npm 10.9.2:

- ESLint, Prettier check, TypeScript check, and production build.
- Development and production smoke checks: home page HTTP 200 and unknown
  route HTTP 404.
- Clean-copy check: copied only Git-visible frontend files to a temporary
  directory without `node_modules`, `.next`, or `next-env.d.ts`; `npm ci --offline`
  from the populated npm cache, production build, and smoke test all passed.
  A fresh machine uses the documented `npm ci` to download those locked packages.

The GitHub Actions run and peer review remain pending until this branch is pushed
and a PR is opened.

## Issue 12 verification evidence

Local ESLint, Prettier, TypeScript, production build, and all six tests passed.
The production HTTP integration check uses a temporary mock gateway to exercise
main content, percentage and fixed offers, expired and future exclusions, empty
results, and an upstream 503. Unit checks cover malformed payloads, date boundaries,
invalid JSON, missing configuration, connection failures, and timeout handling.
Promotion and gateway TypeScript logic achieved 100% line, branch, and function
coverage. This figure excludes JSX; rendered UI behavior is checked over HTTP.
Visual browser checks, live gateway verification, CI, and peer review remain pending.
