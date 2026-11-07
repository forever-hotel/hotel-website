# Screenshot and backlog alignment

Current implementation, requirement/screen evidence and remaining release gates
are recorded in the [DDP-#36 release matrix](../release/traceability.md).
The planning decisions below retain their original approval/status context.

Reviewed on 20 October 2026 against all user-supplied hotel website screenshots,
the [screen catalogue](../../frontend/SCREEN_CATALOGUE.md), the
[Home UI guide](../../frontend/UI_GUIDE.md), and the 36 local draft tickets in
[issue.md](../../issue.md).

This records the user's requested planning update. It does not publish GitHub
issue edits, declare implementation complete, approve hotel facts, or assert
that inferred HW references have been verified against the original SRS.
Keep draft IDs stable and map them to actual GitHub numbers before syncing.

## Decisions from the supplied screens

- Home is one long page. Its Our Story section provides hotel background;
  there is no separate About Us screen or required `/about` route.
- Preserve the old About Us requirements across Home (#13), facilities (#14),
  and Contact/address/map fallback (#15). Approved policies still need an
  accessible placement; absence of a policy screenshot does not remove them.
- Rooms is a full catalogue with filters, availability status and comparison
  entry controls. The screenshot does not require a separate room-detail route;
  detailed information remains accessible in cards/booking selection.
- The full Offers screen had no explicit UI owner in the original plan. #24 now
  owns it alongside promo application, reusing Home's published active data.
- Profile is the My Bookings dashboard (#27), not an unrelated account screen.
- There are four supplied booking screens but five progress milestones. #23 owns
  selection/configuration/guest information; #25 owns payment and confirmed final
  reservation; #26 email; #29 modification/cancellation actions.
- Desktop screenshots guide visual composition. Original assets/fonts, unreadable
  small text and mobile layouts are still pending; document approximations.

## Complete ticket review

| Draft | Review outcome / scope owner                                                                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #01   | Board/branch rules retained; a visual reference does not change project governance.                                                                                 |
| #02   | Backend CI retained; new contract tests still follow existing checks.                                                                                               |
| #03   | Secret/configuration rules retained; no real `.env` values enter documentation.                                                                                     |
| #04   | Frontend foundation retained; use existing app and shared feature structure.                                                                                        |
| #05   | Frontend CI retained; future UI/browser tests extend the existing pipeline.                                                                                         |
| #06   | Contract task retained; missing screenshot-driven contracts are follow-ups listed below, not invented API fields.                                                   |
| #07   | Container task and its recorded verification state retained.                                                                                                        |
| #08   | Guest/room schema mapping retained; storage URLs remain room image data, migrations remain with Infra.                                                              |
| #09   | Registration API retained; UI first/last names map to the real payload, not unapproved schema fields.                                                               |
| #10   | Login/session API retained; unsupported social/recovery flows are not implicitly added.                                                                             |
| #11   | Room API retained; UI uses available fields; missing publication/marketing metadata remains a contract decision.                                                    |
| #12   | Expanded Home composition, honest samples/unfinished controls and later API integration ownership. Existing code does not satisfy all release checks automatically. |
| #13   | Replaces standalone About Us with approved Home story/policy access and shared navigation.                                                                          |
| #14   | Services hero, facility grid, imagery fallbacks and photo-location tile; resolve restaurant naming; retain package coverage.                                        |
| #15   | Full Contact page, map/text-address resilience, enquiry delivery and approved guest-relations content; FAQ remains on Home.                                         |
| #16   | Rooms catalogue, filters, accessible details and image fallbacks; replace Home's hardcoded room previews with API records.                                          |
| #17   | Shared live room/count/calendar availability contract, capacity/quantity validation where supported and honest upstream errors.                                     |
| #18   | Rooms comparison selection/bar and accessible comparison panel; no comparison-result frame was supplied.                                                            |
| #19   | Live Home/Rooms date handoff and booking step-1 calendar/results; avoid stale/assumed availability.                                                                 |
| #20   | Split-photo Sign In/Up layouts, payload mapping, consent, intended return path and honest unsupported social/recovery controls.                                     |
| #21   | Map booking/payment-screen fields to existing schema/derived values/unsupported features without local migrations.                                                  |
| #22   | Server-authoritative quantities, guest/add-on support, quote line items, reservation identity, holds and replay rules.                                              |
| #23   | Booking screens 1–3, five-milestone progress, configuration/guest validation, safe state persistence and handoff.                                                   |
| #24   | Full Offers page, active marketing data, filters/featured offer where supported, context-aware code validation and newsletter decision.                             |
| #25   | Provider-backed payment plus final reservation screen, authoritative pending/confirmed states, print/document boundaries.                                           |
| #26   | Email/final-screen data consistency and delivery/retry truthfulness.                                                                                                |
| #27   | Profile sidebar/sign-out, upcoming/past/cancelled bookings, real counts/details and no invented loyalty balances.                                                   |
| #28   | Repriced changes, eligible cancellation/refunds, cutoff/timezone confirmation, duplicate protection and updated summaries.                                          |
| #29   | Consistent actions from Profile and final confirmation, accessible review/confirmation and refreshed data.                                                          |
| #30   | Contract tests cover screenshot-driven payloads, malformed/unsupported fields and cross-view consistency.                                                           |
| #31   | Browser journey spans retained search through authentication, booking, payment, confirmation and Profile.                                                           |
| #32   | Responsive/accessibility and visual review covers every supplied screen, not only Home.                                                                             |
| #33   | Ownership/security checks include status/documents, return/image URLs, enquiry abuse and provider boundaries.                                                       |
| #34   | Performance adds photo-heavy screens, calendar traffic and quote refresh to original load/concurrency checks.                                                       |
| #35   | Staging checks include implemented public routes, images, guest-only routes and payment-return status.                                                              |
| #36   | Release evidence maps each supplied screen/control to implementation, tests or a named unresolved/deferred decision.                                                |

Foundation/API drafts #01–#11 were reviewed without rewriting their existing
criteria or changing recorded implementation status. Screenshot-driven additions
to implemented APIs must go through explicit contract follow-up and owner review.

## Screenshot-to-delivery ownership

| Screenshot                | Main tickets  | Supporting checks / constraints                                    |
| ------------------------- | ------------- | ------------------------------------------------------------------ |
| Home (six section images) | #12, #13      | #14/#16/#24 catalogue links; #15 FAQ/contact; #19/#23 live planner |
| Rooms                     | #16, #18, #19 | #11/#17 real catalogue/availability; #23 selection handoff         |
| Services                  | #14           | Approved facts/assets; packages link to #24 when supported         |
| Contact                   | #15           | Text address survives map failure; real enquiry delivery           |
| Offers                    | #24           | #06 marketing contract; #22/#23 selected-stay context              |
| Profile                   | #27, #29      | #10/#20 session; #28 change eligibility                            |
| Sign In / Sign Up         | #20           | #09/#10 APIs; no assumed social/recovery endpoints                 |
| Booking step 1            | #19, #23      | #16/#17 catalogue/results/calendar                                 |
| Booking step 2            | #23, #24      | #21/#22 supported configuration/quote; authoritative discount      |
| Booking step 3            | #23, #25      | #22 guest/add-on validation; provider handles payment              |
| Booking step 4            | #25, #26, #29 | Guest-authorized status/documents; #27 shared booking data         |

## Contract and content decisions before enabling controls

These are unresolved inputs, not approvals or working services. The named
ticket owns resolving the decision or explicitly deferring the unsupported
control. Record the decision and any follow-up ticket before closing that work;
do not silently drop original functional requirements.

| Gap                                                                                  | Resolution owner / follow-up                  | Interim implementation rule                                                                                           |
| ------------------------------------------------------------------------------------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Brand, approved hotel history/statistics/reviews/policies, original imagery/fonts    | #13 and #36; hotel content owner              | Label samples or omit unapproved claims.                                                                              |
| WOK versus WON restaurant name, facility hours and package inclusions                | #14; hotel content owner                      | Do not choose a claimed fact from ambiguous screenshots.                                                              |
| Contact address/map, team identities, recipient and enquiry delivery contract        | #15 with #06/gateway/email owners             | Text address fallback; no guessed personal contacts or fake send success.                                             |
| Remote room image storage/hosts, missing photos, publication/merchandising badges    | #16 with #06/#11 and inventory/Infra owners   | Existing API fields only; image fallback; no fabricated badges.                                                       |
| Adult/child limits, room quantity, occupancy, arrival and meal-plan fields           | #17/#21/#22 with #06/Infra                    | Unsupported options excluded/explained; server validates enabled options.                                             |
| Public promotion title, image, description, categories, terms and featured flag      | #24 with #06 and Manager Dashboard            | Existing P1 is insufficient for full screenshot cards; extend contract explicitly or document reduced supported view. |
| Promo code without selected room/date context                                        | #24/#22                                       | Carry code into booking; do not claim eligibility until quote validation.                                             |
| Newsletter provider, consent and membership-rate promises                            | #24 with marketing owner                      | No subscription success or membership promise without a service/approval.                                             |
| Social login, password recovery and session behaviour                                | #20 with #06/auth owner                       | Only enable approved flows; do not invent endpoints or insecure token persistence.                                    |
| Terms/privacy content and registration consent                                       | #13/#20 with hotel/legal content owner        | Release requires accessible approved content; a dummy link is insufficient.                                           |
| Loyalty balances, membership tiers and benefit rules                                 | #27 with owning service                       | Omit/explain unavailable metrics; no made-up points.                                                                  |
| Quote expiry, pending hold lifetime, repricing, quantity and idempotency             | #22/#24/#25 with #06/inventory/payment owners | Server authority; UI edits do not multiply holds.                                                                     |
| Payment full/deposit support and final status read                                   | #25 with #06/payment owner                    | Retain original full/deposit requirement; never trust success redirect alone.                                         |
| Reservation PDF/download contract                                                    | #25 with #06/booking owner                    | Print can use browser view; PDF requires authorized support or a recorded unavailable/deferred state.                 |
| Confirmation email delivery state and approved pre-arrival instructions              | #26                                           | Payment remains valid on email failure; do not falsely claim delivery.                                                |
| Cancellation cutoff/timezone, refund/deposit/fee rules                               | #28 with #06/hotel/payment owners             | Preserve draft requirement pending approval; marketing screenshot is not policy authority.                            |
| Comparison results, modify/cancel dialogs and mobile designs absent from screenshots | #18/#29/#32                                   | Record accessible design adaptations using shared visual tokens.                                                      |

## Dependencies and sequencing

Issue numbers do not guarantee implementation order; for example #16 consumes
#11 catalogue data but #19 adds live availability after #17. This avoids making
catalogue UI depend on a later calendar while still prohibiting fake status.

The core directed chain is:

```text
#12 -> #13 -> #14 / #15 / #16 / #20
#16 + #17 -> #19
#16 + #19 + #20 + #22 -> #23
#22 + #23 + promotion contract -> #24
#22 + #23 + #24 -> #25 -> #26 / #27
#17 + #25 + #26 + #27 -> #28 -> #29
```

This is a simplified view; `issue.md` contains full dependencies. Contract/mock
preparation can run independently, but integrated acceptance requires the real
owning ticket/service. Base booking #23 leaves extension points for #24/#25 so
there is no circular dependency. Revised hour estimates are provisional; break
larger work into linked subtasks when required by the branch-duration guideline.
Keep existing milestone suggestions until the team replans capacity; no project
board, assignee, Sprint commitment or GitHub issue was changed automatically.

## Verification of this planning update

- All 36 draft IDs remain present once; no renumbering or checked completion boxes.
- Each original user story, SRS/SDS reference and Definition of Done remains unless
  the screen allocation explicitly changes its story/scope. Original functional
  requirements such as safe payment, ownership and policy approval are retained.
- Each supplied screen has an issue owner; new/unsupported services have named
  decision ownership instead of invented endpoints.
- Check updated ticket sections, internal links and dependency cycles before
  syncing drafts to the real GitHub issues. Runtime code is unchanged by this review.
