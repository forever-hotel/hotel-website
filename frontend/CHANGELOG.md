# Changelog

## Unreleased

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
