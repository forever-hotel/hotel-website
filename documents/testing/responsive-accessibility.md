# Responsive and accessibility checks (DDP-#32)

From `frontend`, run `npm run build`, then `npm run test:quality`. Chrome or
Edge is required; use `CHROME_BIN` for a nonstandard executable path. No running
backend, gateway, database or external payment account is needed.

The suite audits Home, Rooms, Services, Contact, Offers, Profile, Sign In/Up,
calendar/comparison states, form errors, and the booking stages/details. It
captures 48 viewport/state checks at 320, 768 and 1440 CSS pixels, including
selected keyboard states at 320px, and completes a booking journey at 320px.
It checks document overflow, reduced motion, keyboard activation, skip navigation,
calendar arrow keys, comparison focus return, form-error focus, FAQ and cookie
controls. Map and fixture-image requests are blocked to exercise fallbacks.

The pinned development dependency axe-core checks applicable automated WCAG
2.0/2.1/2.2 A/AA rules, including label/name matching. Rules are not suppressed
to obtain a passing result. Room-link names include their visible action text;
calendar names include the unpadded visible day and any visible Booked status.

Generated evidence is in `.test-artifacts/quality/`: `quality-results.json`,
full-page screenshots, and the browser journey's `results.json`. Failed runs
also attempt a failure screenshot and process logs. Set `E2E_ARTIFACT_DIR` to
choose another output directory. Frontend CI runs separate `e2e` and `quality`
matrix jobs and uploads `browser-quality-results` for the quality job.

The [screen catalogue](../../frontend/SCREEN_CATALOGUE.md) is the visual reference.
Original screenshot pixels, exact fonts and mobile frames were not saved locally,
so this is a structural/responsive review rather than pixel-perfect comparison.
Photographs use existing assets/fallbacks; long screenshots are capped at 16,000
CSS pixels. Comparison tables may scroll within their labelled focusable region
while the document itself must fit the viewport.

A passing automated scan is not a WCAG certification. The report preserves
axe `incomplete` results for manual review, particularly text over photographs
and cross-origin frames. Real screen-reader testing, actual browser zoom,
manual contrast review of imagery and staging/provider behavior still need
human/environment-specific verification. See the
[visitor journey boundaries](visitor-booking-e2e.md) for simulated payments and
other named feature gaps.
