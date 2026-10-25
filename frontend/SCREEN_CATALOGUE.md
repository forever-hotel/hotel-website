# Hotel website screen catalogue

## Source and agreed scope

For the implemented screen/control status, owners, test evidence and named
release gaps, use the [release matrix](../documents/release/traceability.md).
The original proposals below remain design history rather than shipment claims.

This is the durable written reference for all hotel website screenshots supplied
in this conversation on 20 October 2026. Use it together with
[UI_GUIDE.md](UI_GUIDE.md), which documents the Home layout, visual tokens, and
implementation conventions.

Figma: [Forever City Hotel Management System](https://www.figma.com/design/oHP2rxAfJCZeAB2aodrH8I/Forever-city-Hotel-Management-system?node-id=397-2084&p=f).
The design uses “The Grand Meridian” branding within the Forever Hotel project.

**User clarification:** there is no separate About Us screen. The Home page's
Our Story section introduces the hotel. Do not create an About Us route simply
because draft Issue 13 mentions one. Hotel background belongs on Home; expanded
facilities belong on Services, and location/map belongs on Contact. Required
policies still need approved content and an agreed placement.

These notes preserve the visible screen structure and interaction intent. The
original attachment pixels have not been saved as repository image files: they
were supplied in chat, without accessible local source paths. Exact original
fonts, full-resolution images, frame measurements, some small text, and mobile
layouts remain unverified. Do not invent details that cannot be read.

## Screen inventory and proposed routes

Routes below are implementation proposals, not claims that these pages exist.

| Screen label supplied       | Purpose                                         | Proposed route          |
| --------------------------- | ----------------------------------------------- | ----------------------- |
| Home (six earlier sections) | Hotel introduction and landing page             | `/`                     |
| Rooms                       | Room catalogue, filtering, comparison           | `/rooms`                |
| services                    | Full facilities catalogue                       | `/services`             |
| contact                     | Map, enquiry form, guest relations team         | `/contact`              |
| offers                      | Featured promotion, offer catalogue, code entry | `/offers`               |
| 06_profile                  | Guest account and bookings                      | `/profile`              |
| Sign In                     | Guest authentication                            | `/sign-in`              |
| Sign up                     | Guest registration                              | `/sign-up`              |
| Booking step 1              | Availability and initial room selection         | `/booking`, step 1      |
| Booking step 2              | Room configuration and rate summary             | `/booking`, step 2      |
| Bookin step 3               | Guest details and payment handoff               | `/booking`, step 3      |
| Booking step 4              | Confirmed reservation and next actions          | `/booking/confirmation` |

The booking UI has **five progress milestones** (Select Room, Room Details,
Guest Info, Payment, Confirmation), but only four screenshots were supplied.
Do not assume there is a fifth separate page design. Payment UI is included
within the supplied guest-details screen; the payment provider flow still needs
implementation according to the agreed payment contract.

## Shared visual language

- Dark near-black header and footer; cream page backgrounds; white content cards.
- Champagne/gold thin rules, uppercase letter-spaced labels, gold primary actions,
  dark blue secondary card actions, and elegant serif headings with italic words.
- Compact public navigation: Home, Rooms, Services, Offers, Contact, and Book Now
  where shown. Account/booking headers use a compact signed-in guest indicator.
- Inner public pages use a shallow full-width photographic hero with a dark
  overlay, centred page title, and a small subtitle or breadcrumb.
- Room photos use consistent cropping; cards have square edges and subtle borders.
- Availability indicators use green (available), red (fully booked), and blue
  (selected). Always include text so meaning does not depend only on colour.
- The grey canvas, Figma labels, blue selection outlines, handles, and dimension
  badges in the screenshots are editor UI and must not appear in the site.
- Desktop grids should stack on narrow screens. No mobile screenshots were
  supplied; responsive decisions must preserve reading order and usable controls.

## Home

See [UI_GUIDE.md](UI_GUIDE.md) for the complete section-by-section specification.
Keep it as one scrolling page: hero, availability strip, story and statistics,
services preview, rooms preview, promotions, testimonial, FAQ, and footer.
The hotel introduction is already part of this screen; no separate About Us page.

## Rooms

- Shared header, bedroom-image hero titled “Rooms & Suites”, and small subtitle.
- White filter strip with room-type selection and a gold Search action; availability
  legend underneath. A narrow dark bar includes a Compare Rooms action.
- Cream catalogue area with six white cards in a three-column, two-row grid.
- Visible room names: Deluxe Room, Junior Suite, Presidential Suite, Family Deluxe,
  Honeymoon Suite, and Garden View Room.
- Each card: large photo, optional merchandising badge (for example Best Value),
  availability dot/status, category label, room name, short description, amenity
  chips, nightly rate, and a selection/booking action.
- Available rooms use Book Now. A booked room shows an unavailable state instead
  of accepting a booking. Cards include comparison selection controls.
- Bottom row shows additional room imagery and categories; use actual room API
  data rather than assuming the screenshot's six records always exist.
- Screenshot rate labels mix currency formats. Use the agreed API's currency and
  minor-unit handling rather than copying inconsistent sample rates.
- Finish with a compact dark brand/copyright footer.

## Services & Facilities

- Shared header, pool-image hero titled “Services & Facilities”.
- Centred introduction: “Curated Experiences” eyebrow and
  “Everything You Need, Perfectly Delivered” heading with brief description.
- Three-column service layout with image-led white cards and short descriptions.
- Visible facilities: Spa & Wellness Centre, WON restaurant, Meeting Rooms,
  Infinity Swimming Pool, State-of-the-Art Gym, Mini Function Hall, Karaoke Rooms,
  and a dark promotional card for a photo location/experience.
- Some cards include small category icons and gold hours/detail text. Exact hours
  and policies are not readable enough to treat as approved facts.
- The reference uses a solar-panel photograph for the swimming-pool tile. Use an
  approved pool image rather than reproducing this mismatched asset.
- Keep the deliberately varied card heights and generous cream whitespace.
- Compact dark footer.

## Contact Us

- Shared header and shallow pool-image hero titled “Contact Us”.
- Main section split roughly equally: large location map on the left; white
  “Send Us a Message” form on the right.
- Form layout: paired name/email fields, paired phone/subject fields, full-width
  message field, dark blue Send Message action, and short privacy note.
- The map includes location information and a dark fade near its bottom. Always
  render the approved address as accessible text outside the map as well, so a
  blocked or slow embed does not remove contact information.
- Dark lower section titled “Meet Our Guest Relations Team”, with four circular
  portraits/social-style avatars, names, and role captions.
- Do not use guessed names, personal contacts, map coordinates, or third-party
  social profiles. Confirm these details with the hotel.
- Compact dark footer.

## Exclusive Offers

- Shared header and darkened room-photo hero titled “Exclusive Offers”.
- Dark promotion-code strip with labelled input and gold Apply action.
- Cream filter row with an active gold All Offers tab and additional category tabs.
- Large featured room-photo promotion with dark overlay, gold limited-time badge,
  prominent percentage discount, Early Bird Special heading, short copy, and CTA.
- “All Offers” catalogue below, arranged as three columns across two rows.
- Visible card themes: Honeymoon Package, Stay & Pay, Spa & Dine Package,
  Business Traveller Rate, Bed & Breakfast, and a dark newsletter/member-rate card.
- Offer cards combine photo, small category, title, description, inclusions,
  validity/terms text, rate/discount detail, and blue action. Some images have
  circular discount badges in their top-right corners.
- Newsletter card includes email field and Subscribe action. Do not claim a
  subscription succeeded without a real service response.
- Only public, active offers should be displayed; promotion validation is
  authoritative on the backend, including when a code is applied to a booking.
- Compact dark footer.

## Profile / My Bookings

- Signed-in header, dark narrow left account sidebar, and cream main area.
- Sidebar contains guest avatar/initials, name, membership badge, account navigation,
  divider lines, and Sign Out.
- Main heading “My Bookings”; two white summary tiles for booking count and
  loyalty points; booking status tabs below (upcoming, past, cancelled).
- Stacked horizontal booking rows: room thumbnail, reservation reference, room
  title, dates, guest/stay metadata, status badge, and right-aligned price.
- Compact row actions for viewing details, changing, or cancelling where eligible.
- Confirmed and payment-pending examples appear. Actions must follow real booking
  status and policy rules; loyalty metrics need an agreed data source.
- Do not expose another guest's bookings. Use the approved authentication/session
  mechanism and real guest-scoped booking API.

## Sign In

- Slim dark shared header and full-height split layout beneath.
- Left half: bedroom photograph with a heavy dark overlay, lower-left Member
  Benefits eyebrow, “Welcome Back” heading with gold italic word, gold rule,
  description, and four compact benefit bullets.
- Right half: white background and a narrow vertically centred form. Guest Portal
  eyebrow, “Sign In” heading, short description, email, password, Forgot Password
  link, full-width blue Sign In button, social divider, outlined Google/Facebook
  actions, and Sign Up cross-link.
- Social sign-in and password recovery are design affordances, not evidence that
  those services exist. Wire only supported flows; explain unavailable ones.
- Preserve accessible labels, autocomplete, validation feedback, and safe session
  handling. Never put JWTs in localStorage or sessionStorage.

## Sign Up

- Same dark header and split photographic/white composition as Sign In.
- Left: Join the Story eyebrow, “Create Your Account” heading with gold italic
  word, introduction, and three benefit rows with small outlined icons.
- Right: New Member eyebrow, Create Account heading, first/last name on one row,
  email, password, confirm password, terms/privacy agreement checkbox, full-width
  blue Create Account action, and Sign In cross-link.
- Map names and validation to the actual registration API; do not invent fields
  in backend payloads. Confirm legal text and policy links before accepting consent.
- Discount, cancellation, and loyalty benefits in the design are sample marketing
  claims and require approval before being advertised as actual entitlements.

## Booking step 1 — availability and initial selection

- Signed-in header and dark five-milestone progress strip.
- White Check Availability section with check-in/check-out dates and gold
  Check Rooms action, then availability legend on a pale strip.
- Cream results area: available room count, price sort control at top-right,
  photo room card on the left, expanded room-description panel alongside it.
- Room card includes badge, availability status, category, room title, area/bed/
  view metadata, amenity chips, nightly rate, and blue Select action.
- Dark lower Availability Calendar section with month navigation, day grid, and
  legend for check-in/out, selected range, and booked dates.
- Room count, inventory, disabled dates, rates, and calendar state must come from
  real availability responses, including empty and failed request states.

## Booking step 2 — room configuration

- Same progress header with earlier step completed and current step highlighted.
- White summary strip for dates, nights, and applied promo, with Change Dates.
- Cream main area: two-column room-choice grid on the left and sidebar on right.
- Visible options: Deluxe Room, Junior Suite, Honeymoon Suite, Family Deluxe.
  Selected card has gold treatment and a Selected action/checkmark.
- White configuration sidebar: room quantity stepper, occupancy type, promotion
  code, adult and child steppers, and a removal action.
- Dark rate summary beneath: room, dates, nights, quantity, nightly rate, validated
  promotion, discount, total, and a gold continuation action.
- Changing quantities/dates/promotion must refresh the authoritative quote.
  Do not calculate availability or final payable totals solely from UI samples.

## Booking step 3 — guest information and payment

- Progress header and date/promotion summary strip.
- Wide left guest form with narrow right selected-room and rate summary sidebar.
- Guest form: title, first/last name, country of residence, mobile, email,
  confirmation email, arrival time, and special requests.
- Optional meal-plan radios beneath, followed by card-type/payment area, total,
  and Confirm and Pay action. Card brands in the screenshot are visual choices.
- Right sidebar: room thumbnail, title, dates, nights/guest metadata, package
  badge, then dark nightly-rate/discount/taxes/total summary.
- Collect payment using the agreed provider's secure flow. Do not build raw card
  number/CVV storage or assume screenshot card-brand buttons process payments.
- Pricing, promotion, meal supplements, and guest information need backend
  validation. Preserve useful form input after recoverable errors.

## Booking step 4 — confirmation

- All five progress milestones completed, then a dark bedroom-photo hero with
  success emblem, “Your Stay is Reserved”, supporting copy, and booking reference.
- Cream content beneath: large reservation-detail panel and right payment sidebar.
- Reservation panel: header and Download PDF action, room image, booking status,
  reference/date metadata, check-in/check-out timeline, nights, guest details,
  room information, and amenity tags.
- Right sidebar: dark payment summary with nightly totals, promotion, taxes,
  final amount, and masked payment information; outlined Print Reservation,
  Modify Booking, and Cancel Booking actions; help/contact box below.
- Dark “What Happens Next” section has three bordered columns for confirmation
  email, pre-arrival preparation, and check-in, followed by compact footer.
- Render success only after authoritative booking/payment confirmation. Never use
  a sample booking reference as a real result. Handle pending/failed payment,
  duplicate submissions, and ineligible modifications/cancellations explicitly.

## Backlog alignment

The draft backlog has been aligned with these screens. Issue 13 now covers
approved hotel background/policy access on Home and shared navigation; #14 owns
facilities and #15 owns Contact/location and map-failure fallback. None of these
requirements is marked complete simply by recording the design.

See [the complete backlog review](../documents/planning/screenshot-backlog-alignment.md)
for all 36 ticket outcomes, screen ownership, dependencies and unresolved service
contracts. The updated acceptance criteria and tests live in [issue.md](../issue.md).

Do not implement all screens merely because this catalogue exists. Use it as
persistent context for each separately requested issue. API contracts, approved
hotel facts, accessibility, and existing repository guidelines still apply.
