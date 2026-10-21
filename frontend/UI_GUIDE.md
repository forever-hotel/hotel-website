# Hotel website UI reference and build guide

## Design source and status

Issue 15: `/contact` implements the photo hero, split map/form, guest-relations
introduction and shared footer. The hotel's published Makola Road address is
outside the iframe, with a separate directions link. Staff identities and direct
contacts are not fabricated. Home FAQ remains in place. Contact navigation and
the footer enquiry link open `/contact`. See `documents/api/contact-enquiries.md`
from the repository root for delivery modes and pending gateway/provider settings.

Latest image treatment: generated spa, gym, meeting, function-hall and karaoke
illustrations replace empty photo boxes, with visible illustration labels. The
room photograph has an AI-enhanced variant labelled as such; it may reconstruct
fine details and is not a new documentary photograph. Original source files are
preserved. The hero uses the larger original pool photograph. Active copies use
WebP with responsive Next.js image loading. This supersedes earlier placeholder
notes; generated illustrations are not verified hotel facility photos.

Photography update (21 October 2026): Home and Services use pool, dining and room
photos identified on Forever City Hotel's public listings. Image sources are in
`public/images/README.md`. Unverified facility photos now use placeholders; room
category assignment still awaits catalogue integration. This supersedes earlier
notes describing active stock/substitute photos.

Implementation update (21 October 2026): `/services` now implements the Services
screen using shared navigation/footer and scoped styles. Missing or failed photos
have a readable fallback; Karaoke awaits a photograph. Operating hours are omitted
because none were provided. Services navigation opens the new route; Rooms,
Offers and Contact still use existing Home sections. See `README.md` for details.

Brand correction: the user confirms the hotel name is **Forever City Hotel**.
Use it in visible copy, the wordmark, footer, and metadata. “The Grand Meridian”
in the screenshots is reference branding and must not appear in the website.
Use normal browser scrollbar behaviour; do not add a matching empty gutter on
the left side of the page.

See [SCREEN_CATALOGUE.md](SCREEN_CATALOGUE.md) for all additional supplied screens:
Rooms, Services, Contact, Offers, Profile, Sign In, Sign Up, and the booking flow.
There is **no separate About Us screen**. Hotel background belongs on Home,
facilities on Services, and location/map on Contact. Draft Issue 13 now reflects
this scope; do not invent an About Us route. See the
[backlog alignment review](../documents/planning/screenshot-backlog-alignment.md)
for the complete ticket mapping.

Use the [Forever City Hotel Figma file](https://www.figma.com/design/oHP2rxAfJCZeAB2aodrH8I/Forever-city-Hotel-Management-system?node-id=397-2084&p=f)
(file key `oHP2rxAfJCZeAB2aodrH8I`, entry node `397:2084`) and the six home-page
screenshots supplied in this conversation on 20 October 2026.

The screenshots show **one continuous scrolling home page**, not separate routes.
They are now the inspected visual reference. Direct Figma access, exact font
names, original image exports, and mobile frames remain unavailable. Colours and
measurements below are implementation approximations from those screenshots.
The former green-and-cream page and decorative arch are superseded.

## Page composition

Keep this order on `/`:

1. Dark header: The Grand Meridian wordmark, Rooms, Services, Offers, Contact,
   guest-services icon, and gold Book Now action.
2. Full-width hotel/pool photograph with a dark overlay. Centre the welcome
   eyebrow, “Where Elegance Meets Comfort” heading, short introduction, Explore
   Rooms and View Offers actions, and scroll cue. Emphasise “Elegance” in gold italics.
3. Dark stay-planning strip with check-in, check-out, guests, room type, and action.
4. Cream Our Story section: framed room photo, “A Legacy of Refined Hospitality”,
   description, gold rule, and four statistics in a two-column grid.
5. Dark Services section: centred heading, four image tiles for Spa & Wellness,
   WON Restaurant, Fitness Centre, and Swimming Pool, followed by an outline action.
6. Cream Accommodations section: three room cards with photos, descriptions,
   rates, and dark blue actions; centred gold View All Rooms action underneath.
7. Brown Special Offers section: Exclusive Promotions heading and bordered
   offer cards. The real promotion response determines card count and content.
8. Cream Guest Experiences section: centred italic testimonial and attribution.
9. Dark FAQ section: two-column questions, subtle divider lines, gold plus/minus
   marks, and native expandable answers. The first answer starts open.
10. Dark footer: brand introduction, Explore, Guest Services, Contact, and bottom
    copyright row.

A bottom cookie notice follows the reference and dismisses after either choice.
Only its preference is stored locally; no optional tracking is installed.

## Visual system

| Token             | Current value                       | Purpose                          |
| ----------------- | ----------------------------------- | -------------------------------- |
| `--ink`           | `#1b1815`                           | Header, services, FAQ, footer    |
| `--cream`         | `#f7f4ee`                           | Story, rooms, testimonial        |
| `--gold`          | `#ca970d`                           | Primary actions and offer badges |
| `--champagne`     | `#ceb27b`                           | Eyebrows, rules, accents         |
| Offers background | `#2d241f`                           | Promotion band                   |
| Room action       | `#193e54`                           | Blue room buttons                |
| Display type      | Bodoni MT / Didot / Times New Roman | Lightweight serif headings       |
| Body type         | Georgia / Times New Roman           | Readable serif descriptions      |

Use uppercase, widely spaced, small sans-serif type for labels and actions.
Keep generous section spacing (roughly 75–100px desktop, 60px mobile), thin gold
rules, square card corners, and minimal shadows. Do not copy the Figma editor's
blue selection outline or grey canvas into the website.

Desktop: split story layout, four service tiles, three rooms, three promotion
columns, two FAQ columns. At 1000px service tiles become two columns; at 760px
story, rooms, promotions, and FAQ stack. Header navigation wraps, planning fields
form a two-column grid, and the footer wraps. Below 400px service tiles stack.
These responsive choices are implementation decisions because no mobile reference
was supplied. Maintain visible keyboard focus, native form labels, semantic
headings, image alternatives, and reduced-motion support.

## Content and integration boundaries

- Issue 13 extracts shared navigation/header/footer under `src/components/layout/`.
  Rooms/Offers/Contact still use Home previews (`/#...`); Services now links
  to `/services`. The footer explains the remaining temporary destinations.
  Plan Your Stay actions lead to the existing planner without claiming booking.
- Content confirmation: on 20 October 2026 the user confirmed that the hotel
  details are real, and subsequently corrected the statistics to **20+ years of
  experience, 30+ rooms and 5+ awards**. These values supersede the screenshot's
  original statistics. Check-in/out remains 2 PM/noon. Use the supplied history,
  testimonial and Colombo location without sample notices. This confirmation
  does not provide a street address, contact details, additional cancellation
  rules or live pricing/inventory. Do not invent those details.
- “The Grand Meridian” is reproduced from the screenshots. This repository remains
  the Forever Hotel project; metadata includes both names. Confirm final branding
  before release.
- Room names/descriptions and USD rates still come from static design previews;
  rates remain labelled samples until catalogue integration. Story statistics
  and the testimonial are user-confirmed design content, not live API records.
- Only the visible first FAQ answer is directly transcribed; the other answers
  use cautious provisional wording and need hotel confirmation.
- Do not invent contact numbers, email addresses, or policy pages. The footer
  shows Colombo from the reference and a pending-contact message.
- Header and card actions use working section anchors. Guest services links to
  the footer. View All Services opens `/services`; planning actions lead to
  the stay planner.
- The planner validates that check-out follows check-in, then scrolls to room
  previews. It clearly states live booking is unavailable; it does not reserve a
  room, query inventory, or claim availability.
- Promotions retain P1 gateway integration, validity filtering, timeout handling,
  and non-blocking empty state. Do not hardcode the design's Early Bird, Romance,
  or Extended Stay offers as live promotions.
- A real swimming-pool image replaces the reference's apparent solar-panel image
  on its Swimming Pool card. Exact imagery needs the original approved exports.

## Implementation map

| Concern                           | Location                                               |
| --------------------------------- | ------------------------------------------------------ |
| Single-page sections              | `src/app/page.tsx`                                     |
| Tokens, layout, responsive styles | `src/app/globals.css`                                  |
| Sample room/service/FAQ content   | `src/features/home/content.ts`                         |
| Date planner interaction          | `src/features/home/components/stay-planner.tsx`        |
| Cookie preference notice          | `src/features/home/components/cookie-notice.tsx`       |
| Live promotion presentation       | `src/features/promotions/components/active-offers.tsx` |
| Offer filtering and formatting    | `src/features/promotions/api/promotions.ts`            |
| Server-only gateway access        | `src/lib/api/api-client.ts`                            |
| Local photos and provenance       | `public/images/`, `public/images/README.md`            |
| HTTP rendering and offer checks   | `tests/smoke.test.mjs`                                 |

Keep the page server-rendered; client components are limited to the stay planner
and cookie preference. Use `next/image` with responsive sizes; preload only the
hero. Reuse data arrays for repeated cards rather than adding a component layer
for every small piece of markup. Follow [FRONTEND_STRUCTURE.md](FRONTEND_STRUCTURE.md)
and consult the installed Next.js documentation as directed by `AGENTS.md`.

## Build and verify

From `frontend/` with Node.js 22.14+:

```sh
npm ci
npm run dev
```

Open `http://localhost:3001`. Configure optional offers as described in
[README.md](README.md). After editing:

```sh
npm run lint
npm run format:check
npm run typecheck
npm run build
npm test
npm run test:coverage
```

Check the complete page at desktop and mobile widths, image crops, section order,
keyboard navigation, FAQ expansion, date errors, cookie dismissal, live offers,
and empty offers. HTTP tests verify rendered content but do not establish visual
fidelity or hydrated browser interactions. Exact Figma measurements, original
assets/fonts, final hotel content, and visual browser comparison remain pending.
