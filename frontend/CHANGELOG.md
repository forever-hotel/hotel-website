# Changelog

## Unreleased

### Fixed

- Changing rooms or dates no longer silently redirects to an older pending
  checkout with its frozen total. Recovery now offers an explicit review or
  verified unpaid-cancellation choice, preserves the new selection, and clears
  the recovery cookie only after cancellation is confirmed. Regression checks
  cover replacing a three-night LKR 90,000 stay with a one-night LKR 10,000 stay.

- Authentication errors now appear in a red alert with focus and scroll handling.
  Required/invalid fields use the same inline feedback rather than relying only
  on browser validation tooltips; general paragraph styling no longer overrides
  the error color.

### Added

- DDP-#27: guest booking dashboard with category counts, Upcoming/Past/Cancelled
  navigation, pagination and protected reservation details. Includes hotel-date
  classification, expired-hold labels, image fallbacks, loading/empty/error
  states, session-expiry handling and isolated browser acceptance checks.

- DDP-#20: registration and sign-in forms, safe return navigation, server-side
  gateway authentication, an HttpOnly guest cookie, verified account page and
  sign-out. Includes validation, expiry/outage feedback and authentication tests.
  Approved legal content/consent and team session review remain release prerequisites.

- DDP-#19: live Home-to-Rooms date search, guest capacity checks, available-room
  counts and sorting, gateway-backed daily calendars with month navigation and
  keyboard range selection, explicit empty/error/retry states and stale-request
  cancellation. Searches do not create reservation holds.

- DDP-#18: select up to three catalogue room types, remove selections and compare
  live catalogue rates, capacity, descriptions and amenities in an accessible,
  responsive table. Comparison opens only with two or three selections.

### Changed

- Issue 13: extracted shared header/footer and navigation destinations, retained
  hotel background on Home, labelled unapproved story/statistics and FAQ policy
  samples, and added a reachable hotel-policy notice. Unfinished catalogue and
  booking features use existing previews and honest planning labels.
- Rebuilt the home page from six supplied Grand Meridian screenshots as one
  scrolling page with a photo hero, stay planner, story, services, room previews,
  live promotions, testimonial, FAQ, and footer. Added responsive styles, local
  substitute photography, date validation, and dismissible cookie preferences.
- Updated the UI guide with screenshot structure, design tokens, asset provenance,
  responsive decisions, and the distinction between sample content and live data.

### Added

- Issue 16: responsive Rooms catalogue with GET filtering, expandable details,
  unknown-room and empty/error states, shared API-backed Home previews, LKR
  minor-unit formatting, approved remote-image hosts and failed-image fallback.
  Removed static sample room records; comparison/availability remain future work.
- Issue 15: Contact route with an independent text address/map fallback, accessible
  enquiry form, shared navigation, same-origin gateway submission, and truthful
  acceptance/sandbox/error states. Guest-relations identities remain unfilled
  until confirmed.
- Issue 14: Services and Facilities route with a responsive facility catalogue,
  page-scoped CSS, missing/failed image fallback, local event-space photographs,
  and navigation links from Home/header/footer. No facility reservations
  or unprovided operating hours are claimed.
- Home page with hero, hotel introduction, highlights, accessible section navigation,
  responsive styling, and optional current offers (HW-01, DDP-#12).
- Server-side P1 gateway integration with validity filtering, LKR discount formatting,
  request timeout, and a non-blocking empty state.
- Promotion unit coverage and HTTP integration checks using a local mock gateway.
