# Hotel Website development issues

Copy each issue below into **hotel-website** GitHub Issues. These are draft tickets, not issues already created on GitHub.

## How to use this file

1. Create or confirm the existing project board and Sprint 5–8 milestones with the team. Use **Phase: Development** on every ticket.
2. Create tickets in the numbered order. `DDP-#NN` is a **draft ticket ID**, not a real GitHub issue number. Replace it with your team's assigned DDP ID if different, and replace dependency IDs with real `#issue-number` links after creation.
3. Set the **Assignee** to the person actually doing the work. The suggested `epic:*` and priority values are project-board metadata; match your team's existing labels.
4. Create one `feature/<GitHub-issue-number>-<slug>` branch per issue. Open PRs against `develop`. Split any ticket that grows beyond five working days.
5. Confirm the shared API gateway, authentication, room-status, promotions, and infrastructure owners before starting tickets that depend on them. Those components are outside this repo.

The course guide calls development sprints **Sprint 5–8** (PDF pages 6–7). It asks for issue titles, user stories, SRS/SDS references, acceptance criteria, technical notes, tests, Definition of Done, estimates, dependencies, assignee, labels, sprint, priority and phase (PDF pages 13–17). The SDS describes Next.js, NestJS, shared PostgreSQL, gateway routing, and staged CI/CD (SDS §§1, 2, 7.5). No date or GitHub issue number is invented here.

## Screenshot alignment (20 October 2026)

All 36 draft tickets were reviewed against the supplied Home, Rooms, Services,
Contact, Offers, Profile, Sign In/Up and four booking screenshots. See the
[screen catalogue](frontend/SCREEN_CATALOGUE.md) and
[alignment review](documents/planning/screenshot-backlog-alignment.md).
DDP-#01–#11 retain foundation/API scope; missing contract fields are follow-ups,
not silent changes to implemented APIs. DDP-#12–#36 are aligned below.
This documentation update does not mark issues complete or update GitHub tickets.

There is no separate About Us route. #13 owns Home background/policy access and
shared navigation, #14 facilities, #15 Contact/location, and #24 the full Offers
page. Booking uses four supplied screens and five progress milestones. Social
login/recovery, newsletter, loyalty, add-ons and PDF need recorded owner/contract
decisions before enabling them. Revised estimates are provisional; split linked
subtasks if work exceeds the team's five-working-day branch limit.

## Suggested creation order

| Sprint | Focus                         | Draft tickets   |
| ------ | ----------------------------- | --------------- |
| 5      | Foundation and infrastructure | DDP-#01–DDP-#10 |
| 6      | Core website features         | DDP-#11–DDP-#22 |
| 7      | Integration and user journeys | DDP-#23–DDP-#31 |
| 8      | Quality and release           | DDP-#32–DDP-#36 |

---

## [DDP-#01] chore(repo): establish issue board and branch rules

**Assignee:** TBD  
**Labels:** `epic:dev-setup`, `High`, `chore`  
**Sprint milestone:** Sprint 5  
**Priority:** High  
**Phase:** Development

### User Story

As a developer, I want the hotel-website work tracked on the existing project board so that the team can review progress.

### Background / Context

- SRS Reference: SRS Chapter 4.1 (HW scope)
- SDS Reference: SDS §1.1 (independent subsystem)
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given the existing project board, when this issue is added, then Phase is Development, Sprint is 5, and the issue moves through Backlog, To Do, In Progress, In Review, and Done.

**AC2 — Error or edge behaviour:** Given a website issue, when work starts, then its branch uses feature/<GitHub-issue-number>-<slug> and its PR targets develop.

### Technical Notes

Agree assignee, priority labels, branch protection, and one reviewer with the team. Do not create a second board.

### Test Requirements

- [ ] Manual check: board fields and a sample PR target are correct.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 3 hours

### Dependencies

Blocked by: None

---

## [DDP-#02] ci(backend): run NestJS build, lint and tests on PRs

**Assignee:** TBD  
**Labels:** `epic:ci-cd`, `High`, `ci`  
**Sprint milestone:** Sprint 5  
**Priority:** High  
**Phase:** Development

### User Story

As a developer, I want automatic backend checks so that broken code is caught before a merge.

### Background / Context

- SRS Reference: SRS NFR-16, NFR-19
- SDS Reference: SDS §7.5.1–7.5.2 (CI/CD stages)
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given a PR to develop, when CI runs, then backend dependencies install from the lockfile and build, lint, and tests all pass.

**AC2 — Error or edge behaviour:** Given a failing backend test or lint error, when CI runs, then the workflow fails and blocks merge.

### Technical Notes

Use GitHub Actions; avoid real secrets and a production database in CI. Make existing lint non-mutating.

### Test Requirements

- [ ] CI check: one passing run; negative check: a deliberate failing test causes a failed run.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 5 hours

### Dependencies

Blocked by: DDP-#01

---

## [DDP-#03] chore(backend): document local configuration and protect secrets

**Assignee:** TBD  
**Labels:** `epic:security`, `High`, `chore`  
**Sprint milestone:** Sprint 5  
**Priority:** High  
**Phase:** Development

### User Story

As a developer, I want a safe local configuration guide so that the backend can start without leaking credentials.

### Background / Context

- SRS Reference: SRS NFR-10, NFR-13
- SDS Reference: SDS §6.3, §7.4
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given a new checkout, when a developer follows the README and example env file, then required non-secret settings are clear.

**AC2 — Error or edge behaviour:** Given a real .env file, when git status is checked, then it is ignored and no secrets appear in tracked files.

### Technical Notes

Do not copy values from backend/.env. Provide .env.example with placeholders only.

### Test Requirements

- [ ] Check: fresh setup instructions work; negative check: .env is ignored.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 3 hours

### Dependencies

Blocked by: DDP-#01

---

## [DDP-#04] build(frontend): create the Next.js application

**Assignee:** TBD  
**Labels:** `epic:dev-setup`, `High`, `build`  
**Sprint milestone:** Sprint 5  
**Priority:** High  
**Phase:** Development

### User Story

As a developer, I want a working frontend scaffold so that website pages can be built consistently.

### Background / Context

- SRS Reference: SRS §7.1 (Next.js), HW-17
- SDS Reference: SDS §1.1–1.2, §5.1
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given the frontend folder, when dependencies are installed, then the Next.js app starts and builds successfully.

**AC2 — Error or edge behaviour:** Given a clean checkout, when the documented setup steps are followed, then the frontend runs without unpublished local files.

### Technical Notes

Follow the team's TypeScript, ESLint and Prettier conventions. Keep frontend and backend separate.

### Test Requirements

- [ ] Smoke check: app starts; CI build check: production build succeeds.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 5 hours

### Dependencies

Blocked by: DDP-#01

---

## [DDP-#05] ci(frontend): add Next.js build and lint checks

**Assignee:** TBD  
**Labels:** `epic:ci-cd`, `High`, `ci`  
**Sprint milestone:** Sprint 5  
**Priority:** High  
**Phase:** Development

### User Story

As a developer, I want frontend checks on PRs so that UI changes do not break the build.

### Background / Context

- SRS Reference: SRS HW-17, NFR-16
- SDS Reference: SDS §7.5.1–7.5.2
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given a PR that changes frontend files, when CI runs, then install, lint, tests, and build pass.

**AC2 — Error or edge behaviour:** Given a frontend build error, when CI runs, then the PR check fails.

### Technical Notes

Use a lockfile and cache dependencies. Add a test command once meaningful frontend tests exist.

### Test Requirements

- [ ] CI check: passing frontend run; negative check: a build error fails CI.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 4 hours

### Dependencies

Blocked by: DDP-#02, DDP-#04

---

## [DDP-#06] docs(architecture): agree hotel website API contracts

**Assignee:** TBD  
**Labels:** `epic:api`, `High`, `docs`  
**Sprint milestone:** Sprint 5  
**Priority:** High  
**Phase:** Development

### User Story

As a website developer, I want agreed API request and response shapes so that my frontend and backend fit the other services.

### Background / Context

- SRS Reference: SRS HW-01, HW-03, HW-05–HW-14; CI-01
- SDS Reference: SDS §1.1, §1.4.1, §1.5.2, §4.1
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given the contract document, when the website team reviews it, then rooms, availability, guest auth, bookings, promotions and payment requests have named owners and request/response examples.

**AC2 — Error or edge behaviour:** Given an unavailable room or invalid promo code, when the contract is reviewed, then error codes and bodies are defined.

### Technical Notes

Coordinate room status with front desk, promotions with manager dashboard, auth with gateway/auth owner, and public routes with gateway owner. Do not assume URL paths from the SDS.

### Test Requirements

- [ ] Review check: each contract includes a success and error example; owner sign-off recorded.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 6 hours

### Dependencies

Blocked by: DDP-#01

---

## [DDP-#07] build(deployment): containerize hotel frontend and backend

Implementation: [container setup](README.md#local-container-setup).
Status: configuration implemented; image builds and container smoke verification pending because the local Docker Linux engine was unavailable at implementation time. Keep this issue open until verification passes.

**Assignee:** TBD  
**Labels:** `epic:ci-cd`, `High`, `build`  
**Sprint milestone:** Sprint 5  
**Priority:** High  
**Phase:** Development

### User Story

As a developer, I want repeatable containers so that the website can run in team environments.

### Background / Context

- SRS Reference: SRS NFR-19
- SDS Reference: SDS §1.2, §7.1, §7.4
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

- [ ] Given a clean checkout, both frontend and backend Docker images build.
- [ ] Given local configuration, the frontend, backend and database become healthy.
- [ ] Only frontend port 3001 is published, on loopback; backend/database remain private.
- [ ] Both application containers run as non-root users.
- [ ] Missing database credentials fail configuration validation.
- [ ] A database outage returns backend 503 DATABASE_UNAVAILABLE.
- [ ] Configuration and generated files are excluded from image build contexts.

### Technical Notes

Use the existing backend image and a Next.js standalone frontend image. Local
Compose is a smoke environment with a separate PostgreSQL volume; shared gateway
routes and production deployment remain with Infra. No production deployment or
real external integration is included.

### Test Requirements

- [ ] Attach successful image build and container CI results.
- [ ] Attach healthy startup and database-outage results.
- [ ] Verify private port bindings and non-root users.
- [ ] Verify local setup documentation from a clean checkout.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

Unit coverage is not applicable to container configuration; runtime behavior is verified through container smoke checks.

### Estimate

Estimated: 6 hours

### Dependencies

Blocked by: DDP-#03, DDP-#04

---

## [DDP-#08] feat(data): map guest and room entities onto the infra schema

**Assignee:** TBD  
**Labels:** `epic:data-layer`, `High`, `build`  
**Sprint milestone:** Sprint 5  
**Priority:** High  
**Phase:** Development

### User Story

As a developer, I want TypeORM entities that match the shared guest and room tables so that account and room features have a reliable base.

### Background / Context

- SRS Reference: SRS HW-03, HW-06, §13.1; NFR-16
- SDS Reference: SDS §2.1–2.2, §1.5.2
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given a database created from the infra schema, when the backend starts with `DB_SYNCHRONIZE=false`, then entities for `guests`, `room_types`, `room_type_images`, `room_type_amenities` and `rooms` load and can read and write rows without changing the schema.

**AC2 — Error or edge behaviour:** Given a duplicate guest email or invalid room type reference, when data is inserted through the repository, then the database rejects it and the error is mapped to a clear error code.

### Technical Notes

Tables are created and changed only by migrations in `forever-hotel/infra`; this repository runs no migrations. Entity names, columns and types must match the infra schema exactly. Missing columns are requested from infra, not added here. See `documents/database/hotel-website-database-decisions.md`.

### Test Requirements

- [ ] Integration test against the Compose/CI database loaded from `database/infra-schema/`: entities read and write; negative test: duplicate or invalid data rejected.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 8 hours

### Dependencies

Blocked by: DDP-#06

---

## [DDP-#09] feat(auth): implement guest registration API

**Assignee:** TBD  
**Labels:** `epic:auth`, `High`, `feat`  
**Sprint milestone:** Sprint 5  
**Priority:** High  
**Phase:** Development

### User Story

As a visitor, I want to register so that I can make a booking.

### Background / Context

- SRS Reference: SRS HW-06
- SDS Reference: SDS §5.2.1 Figure 14, §6.1.2, §6.1.4, §6.4
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given valid name, email and password, when I register, then one guest account is created and the password is stored only as a bcrypt hash.

**AC2 — Error or edge behaviour:** Given an existing email or invalid input, when I register, then the API returns a clear validation or conflict error without creating another account.

### Technical Notes

Agree ownership with any shared auth service first. Normalize email; never return password hashes.

### Test Requirements

- [ ] Unit: input rules; integration: successful registration; negative: duplicate email and weak/invalid input.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 8 hours

### Dependencies

Blocked by: DDP-#06, DDP-#08

---

## [DDP-#10] feat(auth): implement guest login and protected session

**Assignee:** TBD  
**Labels:** `epic:auth`, `High`, `feat`  
**Sprint milestone:** Sprint 5  
**Priority:** High  
**Phase:** Development

### User Story

As a registered guest, I want to log in so that I can see and manage my bookings.

### Background / Context

- SRS Reference: SRS HW-07, NFR-12
- SDS Reference: SDS §5.2.1 Figure 15, §6.1.1–6.1.2, §6.2
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given correct credentials, when I log in, then a valid guest session token is issued and protected guest routes are accessible.

**AC2 — Error or edge behaviour:** Given incorrect credentials or no token, when I request a protected route, then I receive HTTP 401 and no guest data.

### Technical Notes

Align token issuing and validation with the shared auth and gateway owners; do not duplicate a central auth service without an ADR.

### Test Requirements

- [ ] Integration: login and protected request; negative: bad password and missing token.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 8 hours

### Dependencies

Blocked by: DDP-#06, DDP-#09

---

## [DDP-#11] feat(rooms): implement room type catalogue API

**Assignee:** TBD  
**Labels:** `epic:api`, `High`, `feat`  
**Sprint milestone:** Sprint 6  
**Priority:** High  
**Phase:** Development

### User Story

As a visitor, I want room details so that I can choose a suitable room.

### Background / Context

- SRS Reference: SRS HW-03
- SDS Reference: SDS §2.1–2.2, §1.4.1
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given published room types, when I request the catalogue, then each result has name, images, amenities and price per night.

**AC2 — Error or edge behaviour:** Given an unknown room type, when I request its detail, then the API returns HTTP 404 with a documented error body.

### Technical Notes

Agree who updates room inventory and images. Expose public read routes through the gateway.

### Test Requirements

- [ ] Integration: list and detail; negative: unknown ID returns 404.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 7 hours

### Dependencies

Blocked by: DDP-#06, DDP-#08

---

## [DDP-#12] feat(frontend): build home page and active promotion area

**Assignee:** TBD  
**Labels:** `epic:ui-frontend`, `High`, `feat`  
**Sprint milestone:** Sprint 6  
**Priority:** High  
**Phase:** Development

### User Story

As a visitor, I want a clear home page so that I can learn about the hotel and current offers.

### Background / Context

- SRS Reference: SRS HW-01
- SDS Reference: SDS §5.1; §5.2.1
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given hotel content, when I open the home page, then the hero, description and highlights are visible.

**AC2 — Error or edge behaviour:** Given active promotions, when I open the home page, then only active offers appear; when none exist, the layout remains usable.

**AC3 — Screenshot alignment:** Home is one scrolling page: hero, stay planner, story/statistics, services and room previews, promotions, testimonial, FAQ, footer. Only published active offers appear; empty/error states remain non-blocking. Until integrated, room rates/reviews and unapproved facts remain explicitly illustrative. Hotel background is on Home, not an About Us route.

### Technical Notes

Promotion data is owned by manager dashboard; consume the agreed read contract and allow a non-blocking empty state.

#13 owns approved story/policy content and shared navigation; #14/#16/#24 provide full catalogue destinations; #15 owns Contact. #16 replaces hardcoded Home room images/names/rates with catalogue data; #19/#23 connect date search/booking. Existing UI does not imply these integrations are complete.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] UI: main content renders; integration: active offer shown; negative: empty offer response handled.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

- [ ] Screenshot/integration checks: Section order, navigation/CTA targets, responsive layout, FAQ expansion, cookie dismissal, active/expired/future/empty/failed offers, missing images, and honest sample/unconnected states.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 7 hours

### Dependencies

Blocked by: DDP-#04, DDP-#06

---

## [DDP-#13] feat(frontend): align Home hotel information and shared navigation

**Assignee:** TBD  
**Labels:** `epic:ui-frontend`, `High`, `feat`  
**Sprint milestone:** Sprint 6  
**Priority:** High  
**Phase:** Development

### User Story

As a visitor, I want approved hotel background on Home and clear links to facilities, policies and location so that I can decide whether to visit without a separate About Us page.

### Background / Context

- SRS Reference: SRS HW-02
- SDS Reference: SDS §5.1
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given approved history, description and statistics, Home's Our Story section presents them readably. Shared navigation/footer links hotel background to /#our-hotel, and Rooms, Services, Offers and Contact to their implemented destinations.

**AC2 — Error or edge behaviour:** Missing/unapproved facts, testimonials, policies or benefits are omitted or labelled as samples; no invented About Us route or dead link to unfinished pages is introduced. Temporary destinations are honest until their owning ticket lands.

**AC3 — Requirement allocation:** Background is owned here on Home, facilities by #14 on Services, and approved address/map plus blocked-map fallback by #15 on Contact. Approved general policy text remains accessible from Home FAQ/footer or a clearly linked existing section. Record content approval and placement before release.

### Technical Notes

Use approved hotel facts and policies on Home. The approved Google Maps location and map-failure fallback are delivered under #15 on Contact.

Supersedes the former standalone About Us scope per user clarification. Extract simple shared header/footer elements for upcoming screens where useful. Do not create /about solely for the original title. Preserve history/facility/policy/location coverage across #13/#14/#15; this allocation does not mark any requirement complete.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] UI: approved Home story and policy access, shared navigation/footer, hotel-background link.
- [ ] Negative: unavailable content and unfinished destinations do not create fabricated claims or dead links.
- [ ] Traceability: history/facilities/policies/location assigned to #13/#14/#15; map-failure test belongs to #15.
- [ ] Attach acceptance-criteria evidence.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 6 hours (revised planning estimate after screenshot review; confirm with the assignee).

### Dependencies

Blocked by: DDP-#12; approved hotel facts and policy content. #14/#15 deliver their separately allocated content.

---

## [DDP-#14] feat(frontend): build Services and Facilities page

**Assignee:** TBD  
**Labels:** `epic:ui-frontend`, `High`, `feat`  
**Sprint milestone:** Sprint 6  
**Priority:** High  
**Phase:** Development

### User Story

As a visitor, I want to browse facilities so that I know what the hotel offers.

### Background / Context

- SRS Reference: SRS HW-15
- SDS Reference: SDS §5.1
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given approved facility content, when I open the page, then pool, karaoke, WOK restaurant, meeting rooms, function hall, spa, gym, honeymoon packages and scenic photo locations are listed.

**AC2 — Error or edge behaviour:** Given a facility without an image, when I view it, then its name and description remain readable.

**AC3 — Screenshot alignment:** /services matches the supplied hero, centred introduction, three-column varied-height facility cards and photo-location tile, with shared footer. Missing/failed photos retain readable approved descriptions/hours; layout stacks on mobile. Preserve pool, karaoke, restaurant, meeting rooms, function hall, spa, gym, scenic photos and honeymoon-package coverage; link approved packages to Offers where appropriate.

### Technical Notes

Use approved descriptions and images. Do not imply a facility is bookable online unless the SRS says so.

Resolve WOK (original draft) versus WON (screenshot) restaurant naming with the hotel. Do not copy the solar-panel photo used for the pool tile; use an approved pool image. Hours and facility reservations need approved facts/services rather than screenshot assumptions.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] UI: required facilities listed; negative: missing image fallback.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

- [ ] Screenshot/integration checks: Required facilities/packages, hero/grid/footer, missing/broken images, absent hours, mobile reading order and unsupported facility-booking actions.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 5 hours

### Dependencies

Blocked by: DDP-#04, DDP-#13; approved facility content and imagery.

---

## [DDP-#15] feat(contact): build Contact page and retain Home FAQ

**Assignee:** TBD  
**Labels:** `epic:core-features`, `Medium`, `feat`  
**Sprint milestone:** Sprint 6  
**Priority:** Medium  
**Phase:** Development

### User Story

As a visitor, I want answers and a contact form so that I can ask the hotel questions.

### Background / Context

- SRS Reference: SRS HW-16
- SDS Reference: SDS §5.1, §6.4
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Home retains accessible FAQ accordions. /contact follows the screenshot: photographic hero, map/address beside a labelled enquiry form, approved guest-relations information and shared footer. Form fields cover name, email, optional phone, subject and message according to the agreed contract.

**AC2 — Error or edge behaviour:** A slow/blocked/failed map never prevents reading the approved address/contact details or using the form. Invalid input is rejected; delivery/provider failure retains safe inputs and offers retry without claiming success.

**AC3 — Delivery:** Valid enquiries use the agreed backend/gateway management-email contract and rate limits. The UI distinguishes accepted/queued from delivered status according to the actual provider guarantee and prevents accidental duplicate submissions.

### Technical Notes

Confirm management recipient and email provider with the team. Protect against abuse with rate limits at the gateway.

Owns the original #13 location/map-failure requirement. Confirm address, coordinates, contact API/recipient/provider, guest-relations identities/portraits and permissions for social links. Do not invent personal contacts or unreadable screenshot details. FAQ policies need approval; no separate FAQ page is required.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] UI: accessible Home FAQ, Contact hero/map/form, approved team information and responsive layout.
- [ ] Negative: block map requests and verify text address/form remain usable; invalid input, provider failure, retry and repeated submit.
- [ ] Integration: management delivery via sandbox/mock and honest accepted/delivered feedback.
- [ ] Attach acceptance-criteria evidence.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 10 hours (revised planning estimate after screenshot review; confirm with the assignee).

### Dependencies

Blocked by: DDP-#04, DDP-#06, DDP-#12, DDP-#13; approved location/contact data and enquiry/email contract.

---

## [DDP-#16] feat(frontend): build Rooms catalogue and API-backed Home room previews

**Assignee:** TBD  
**Labels:** `epic:ui-frontend`, `High`, `feat`  
**Sprint milestone:** Sprint 6  
**Priority:** High  
**Phase:** Development

### User Story

As a visitor, I want to see rooms, amenities and prices so that I can choose a room.

### Background / Context

- SRS Reference: SRS HW-03
- SDS Reference: SDS §5.1, §1.4.1
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** /rooms follows the screenshot with room-photo hero, room-type filter/search, availability legend, comparison affordances, responsive room grid and footer. API records supply images, names, descriptions, capacity, amenities, currency and nightly prices. Home previews use the same catalogue source instead of sample records/rates.

**AC2 — Error or edge behaviour:** Empty/failed responses and missing/failed images show useful fallbacks. Unknown room selection has a clear not-found state. Availability without a live date query is labelled unknown/check dates, never assumed available.

**AC3 — Details and ownership:** Room details remain accessible through cards or the booking selection panel; no separate detail-page design was supplied. #18 owns comparison behaviour, #19 date-scoped availability and #23 booking handoff.

### Technical Notes

Consume the agreed catalogue API. Show currency and price basis clearly.

Consume gateway APIs rather than database access. Database image records provide approved storage URLs; configure permitted remote-image hosts accordingly. Use API currency/minor units, not mixed USD/LKR screenshot samples. Merchandising/publication badges need real metadata or omission. Do not hardcode the screenshot's six room types. Existing detail API remains available without inventing a mandatory new route.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] UI/integration: Rooms and Home use API images/names/prices; filtering, details, capacity, amenities and currency formatting.
- [ ] Negative: empty/failure response, unknown room, missing/broken image and unknown availability.
- [ ] Verify comparison/booking controls integrate under #18/#19/#23 without fake availability.
- [ ] Attach acceptance-criteria evidence.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 12 hours (revised planning estimate after screenshot review; confirm with the assignee).

### Dependencies

Blocked by: DDP-#04, DDP-#06, DDP-#11, DDP-#13. Live date/status integration is owned by #19 after #17.

---

## [DDP-#17] feat(rooms): implement date-based availability API

**Assignee:** TBD  
**Labels:** `epic:api`, `High`, `feat`  
**Sprint milestone:** Sprint 6  
**Priority:** High  
**Phase:** Development

### User Story

As a visitor, I want to check dates so that I only choose rooms that can be booked.

### Background / Context

- SRS Reference: SRS HW-05, HW-09; §6.1 rules 1 and 4
- SDS Reference: SDS §2.1, §4.1, §1.4.1
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given a room type and valid date range, when availability is requested, then available and blocked dates reflect current bookings and room status.

**AC2 — Error or edge behaviour:** Given checkout before check-in or an invalid date, when availability is requested, then the API returns a validation error.

**AC3 — Screenshot alignment:** The agreed availability response supports room status/counts, quantities/occupancy where approved, and blocked/available calendar dates for Rooms and booking step 1. Inventory dependency failure is reported as unknown/error rather than falsely available.

### Technical Notes

Coordinate room blocks and status with front desk owner. Define timezone, date boundaries and response shape in contract.

Home planner, room indicators, results and calendar share the same date context and timezone semantics. Agree child/quantity support and capacity validation with owners; schema changes belong to Infra.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] Integration: available and occupied dates; negative: invalid range and blocked date.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

- [ ] Screenshot/integration checks: Status/count/calendar consistency, invalid supported quantity/occupancy, inventory outage and no false availability.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 8 hours

### Dependencies

Blocked by: DDP-#06, DDP-#08, DDP-#11

---

## [DDP-#18] feat(frontend): add room comparison for up to three types

**Assignee:** TBD  
**Labels:** `epic:ui-frontend`, `Medium`, `feat`  
**Sprint milestone:** Sprint 6  
**Priority:** Medium  
**Phase:** Development

### User Story

As a visitor, I want to compare rooms so that I can choose the best option.

### Background / Context

- SRS Reference: SRS HW-04
- SDS Reference: SDS §5.1
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given two or three selected room types, when I compare them, then price and amenities appear side by side.

**AC2 — Error or edge behaviour:** Given three selected types, when I try to add a fourth, then the UI prevents it and explains the limit.

**AC3 — Screenshot alignment:** Room-card selections drive the Rooms Compare bar. Fewer than two selections cannot open an empty comparison; removing selections updates counts. Keyboard users can enter/leave the comparison and the two/three-room limit remains enforced.

### Technical Notes

Use catalogue data as the single source of room details.

No expanded comparison screenshot was supplied. Use a simple accessible panel/dialog or table with shared tokens, documenting that design adaptation instead of inventing a required separate route.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] UI: compare two and three; edge: fourth selection blocked.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

- [ ] Screenshot/integration checks: Checkbox/bar count, zero/one-selection state, removal, fourth-selection limit, focus/close and responsive comparison.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 5 hours

### Dependencies

Blocked by: DDP-#16

---

## [DDP-#19] feat(frontend): integrate date search and booking availability calendar

**Assignee:** TBD  
**Labels:** `epic:ui-frontend`, `High`, `feat`  
**Sprint milestone:** Sprint 6  
**Priority:** High  
**Phase:** Development

### User Story

As a visitor, I want a calendar so that I can find dates when a room type is free.

### Background / Context

- SRS Reference: SRS HW-05
- SDS Reference: SDS §5.1, §1.4.1
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Home planner and Rooms entry carry selected dates, guests and room type into live search. Booking step 1 shows actual available-room count/sort controls and its dark calendar with month navigation, check-in/out, range and booked states, all labelled accessibly.

**AC2 — Error or edge behaviour:** Invalid ranges, blocked dates, empty inventory and API errors have clear validation/empty/retry states. Date changes invalidate stale results; cached availability is never a reservation guarantee.

**AC3 — Shared context:** Search fields, card statuses, results and calendar agree on the same date/room context. Keyboard selection cannot treat blocked dates as available.

### Technical Notes

Use date-based API data and avoid treating cached availability as a booking guarantee.

Use #17 API and #16 catalogue cards. Own live planner/date search and booking step-1 calendar primitives; #23 owns subsequent selection/configuration. Opening or editing a calendar must not create repeated reservation holds.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] UI/integration: planner handoff, date search, result count/sort/status, month navigation, keyboard range selection.
- [ ] Negative: invalid/blocked dates, empty inventory, failed API and stale response after edits.
- [ ] Attach acceptance-criteria evidence.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 10 hours (revised planning estimate after screenshot review; confirm with the assignee).

### Dependencies

Blocked by: DDP-#12, DDP-#16, DDP-#17.

---

## [DDP-#20] feat(frontend): build registration and login forms

**Assignee:** TBD  
**Labels:** `epic:ui-frontend`, `High`, `feat`  
**Sprint milestone:** Sprint 6  
**Priority:** High  
**Phase:** Development

### User Story

As a visitor, I want to create an account or sign in so that I can book a room.

### Background / Context

- SRS Reference: SRS HW-06, HW-07
- SDS Reference: SDS §5.2.1 Figures 14–15, §6.1.2
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Sign In/Up match the split-photo/white-form screenshots, branding and cross-links. Registration validates displayed names, email, password/confirmation and approved consent; navigation follows the real API response instead of assuming registration creates a session. Login returns to a safe intended booking/profile destination.

**AC2 — Error or edge behaviour:** Invalid input, duplicate email, 401, network failure and expired session have usable errors without credential leaks. Safe stay selection survives login; untrusted external return URLs are rejected.

**AC3 — Design controls:** Google/Facebook login and Forgot Password are enabled only with approved supporting services; otherwise omit them or explain unavailability. Terms/privacy consent links require approved accessible content before release.

### Technical Notes

Follow the team session approach agreed with the auth/gateway owner; do not persist raw passwords.

Use the agreed auth/gateway session approach; do not store raw passwords or JWTs in localStorage/sessionStorage. Map displayed first/last names to the actual fullName payload without inventing API fields. Social/recovery services, loyalty points and member/cancellation benefits are not confirmed by screenshot artwork.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] UI/integration: layouts, cross-links, name mapping, password confirmation/consent, real registration/login outcome and intended return.
- [ ] Negative: duplicate email, 401, invalid input, network/session failure, unsafe return URL, unsupported social/recovery.
- [ ] Attach acceptance-criteria evidence.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 10 hours (revised planning estimate after screenshot review; confirm with the assignee).

### Dependencies

Blocked by: DDP-#04, DDP-#06, DDP-#09, DDP-#10, DDP-#13; agreed session handling and approved legal content.

---

## [DDP-#21] feat(bookings): map booking and payment entities onto the infra schema

**Assignee:** TBD  
**Labels:** `epic:data-layer`, `High`, `feat`  
**Sprint milestone:** Sprint 6  
**Priority:** High  
**Phase:** Development

### User Story

As a developer, I want booking and payment records so that reservations can be stored and audited.

### Background / Context

- SRS Reference: SRS HW-08–HW-14; §13.1; NFR-16
- SDS Reference: SDS §2.1–2.2, §4.1
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given a database created from the infra schema, when the backend starts, then booking and payment entities load with their relationships and statuses, without changing the schema.

**AC2 — Error or edge behaviour:** Given an invalid guest or room reference, when a booking is inserted, then the database rejects it.

### Technical Notes

Confirm ownership with front desk and shared DB maintainers. Tables come from `forever-hotel/infra` migrations; this repository runs none. Payment records store provider references, never card data.

Map screenshot room quantities, adult/child counts, meal plans, arrival time, requests and summary fields to existing infra fields, derived values or recorded unsupported features. Request missing fields from Infra; never create local migrations or raw-card storage to match the design.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] Integration test against the infra-schema database: entities read and write; negative: invalid foreign keys and status constraints.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

- [ ] Screenshot/integration checks: Document each booking-screen field as supported storage, derived value or unresolved owner decision.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 8 hours

### Dependencies

Blocked by: DDP-#06, DDP-#08

---

## [DDP-#22] feat(bookings): create booking quote and reservation API

**Assignee:** TBD  
**Labels:** `epic:core-features`, `High`, `feat`  
**Sprint milestone:** Sprint 6  
**Priority:** High  
**Phase:** Development

### User Story

As a guest, I want to reserve a room for chosen dates so that I can complete payment.

### Background / Context

- SRS Reference: SRS HW-08, HW-09; §6.1 rules 1, 3 and 4
- SDS Reference: SDS §4.1, §5.2.1 Figure 16
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given valid dates, room type, guest count and optional requests, when I start a booking, then the API returns an accurate quote and a pending reservation.

**AC2 — Error or edge behaviour:** Given blocked dates or two simultaneous requests for the last room, when a reservation is attempted, then no overbooking occurs and the losing request receives a conflict error.

**AC3 — Screenshot alignment:** Quote/reservation contracts cover approved room quantities, occupancy and guest/request/add-on fields and return authoritative currency, line items, taxes, discounts, total and quote/reservation identity. Unsupported options are rejected or excluded explicitly. Stale/replayed submissions follow agreed idempotency/hold-expiry rules.

### Technical Notes

Recheck availability in a transaction. A pending reservation is not confirmed until Stripe confirms payment.

Separate quote recalculation from reservation creation; UI edits must not multiply holds. Agree child/quantity/meal support, guest field mapping and hold TTL under #06. Never trust browser prices, stepper limits or sample totals.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] Unit: pricing and date rules; integration: create booking; concurrency: last-room race; negative: overlap.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

- [ ] Screenshot/integration checks: Quantity/occupancy pricing, line items, tampered prices, unsupported fields, stale quote/hold, duplicate submit and unavailable quantity.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 10 hours

### Dependencies

Blocked by: DDP-#10, DDP-#17, DDP-#21

---

## [DDP-#23] feat(frontend): build booking selection and guest-information flow

**Assignee:** TBD  
**Labels:** `epic:ui-frontend`, `High`, `feat`  
**Sprint milestone:** Sprint 7  
**Priority:** High  
**Phase:** Development

### User Story

As a logged-in guest, I want guided booking steps so that I can enter details and pay correctly.

### Background / Context

- SRS Reference: SRS HW-08, HW-17
- SDS Reference: SDS §5.2.1 Figure 16
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Four supplied booking screens share five milestones: Select Room, Room Details, Guest Info, Payment, Confirmation. This issue builds screens 1–3: room results/selection, room configuration and rate sidebar, guest form with room/quote summary and payment handoff. Safe dates/guests/room quantities persist through supported back/forward navigation.

**AC2 — Error or edge behaviour:** Invalid dates/capacity, sold-out rooms, stale quotes, network or sign-in failure block invalid progression, explain recovery and retain safe inputs. Editing dates or configuration revalidates dependent selections and totals.

**AC3 — Ownership:** #19 supplies search/calendar, #24 promo application, #25 payment/final confirmation, #26 email, #29 modification UI. Meal plans, child counts and arrival options are enabled only with agreed pricing/contracts. Do not implement raw card entry here.

### Technical Notes

Use the real booking quote API. Show the five designed milestones: Select Room, Room Details, Guest Info, Payment and Confirmation, across the four supplied booking screens.

Follow booking screenshots 1–3, using #22 quote/reservation identity. Include selected-card treatment, supported adult/child/room steppers, editable dates, guest email confirmation, requests and field errors. Five milestones do not require a fifth designed page. Mock fixtures must not appear as a live reservation. Requote after changes.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] UI/integration: selection/configuration, guest validation, consistent sidebar, progress milestones and handoff.
- [ ] Negative: sold-out, invalid dates/capacity, stale quote, API/session failure, refresh/back and duplicate continue.
- [ ] Supported optional fields and safe-input recovery follow the actual contract.
- [ ] Attach acceptance-criteria evidence.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 16 hours (revised planning estimate after screenshot review; confirm with the assignee).

### Dependencies

Blocked by: DDP-#16, DDP-#19, DDP-#20, DDP-#22. Base flow does not depend on later #24/#25 integrations.

---

## [DDP-#24] feat(promotions): build Offers page and apply manager promo codes

**Assignee:** TBD  
**Labels:** `epic:integration`, `High`, `feat`  
**Sprint milestone:** Sprint 7  
**Priority:** High  
**Phase:** Development

### User Story

As a guest, I want to apply a valid promo code so that I receive the advertised discount.

### Background / Context

- SRS Reference: SRS HW-01, HW-10; MD-05c
- SDS Reference: SDS §4.7, §5.2.1 Figure 16, §1.5.2
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** /offers follows the screenshot with photographic hero, code strip, supported filters, featured active offer, offer cards and footer. Home/Offers share published active data. A valid code applied to a selected stay updates server-priced booking line items and total.

**AC2 — Error or edge behaviour:** Expired/inactive/exhausted/ineligible codes do not reduce prices. Empty/failed public data preserves layout. Code entry without stay context guides selection without claiming validation. Unsupported category/featured fields are not fabricated.

**AC3 — Contract readiness:** Public offer titles, imagery, descriptions, inclusions, terms, categories and featured flags require an agreed marketing contract; current P1 code/discount fields alone are insufficient. Newsletter submission is enabled only with an approved subscription/consent contract; otherwise explain its unavailable state.

### Technical Notes

Manager dashboard owns creation and activation; use its published contract. Calculate final totals on the server.

Manager Dashboard owns publication/eligibility/redemption. Resolve marketing-field and newsletter ownership under #06 follow-up. Reuse Home filtering/error handling and revalidate after booking edits. Existing Home integration does not complete Offers. Never hardcode screenshot discounts/packages or fake subscription success.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] UI/contract: hero, supported filters/featured/cards, Home consistency and empty/error states.
- [ ] Integration: percent/fixed application, inactive/expired/exhausted/ineligible code and stale context.
- [ ] Code entry without a stay; honest newsletter state or approved opt-in/provider success/failure.
- [ ] Attach acceptance-criteria evidence.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 16 hours (revised planning estimate after screenshot review; confirm with the assignee).

### Dependencies

Blocked by: DDP-#06, DDP-#12, DDP-#13, DDP-#22, DDP-#23; Manager Dashboard marketing/validation contract. Newsletter needs a separately agreed provider contract.

---

## [DDP-#25] feat(payments): integrate Stripe checkout and reservation confirmation

**Assignee:** TBD  
**Labels:** `epic:integration`, `High`, `feat`  
**Sprint milestone:** Sprint 7  
**Priority:** High  
**Phase:** Development

### User Story

As a guest, I want to pay in full or pay an advance deposit so that my booking can be confirmed.

### Background / Context

- SRS Reference: SRS HW-11, NFR-13; §6.1 rule 3
- SDS Reference: SDS §4.1, §6.3.1, §7.4
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given a pending reservation, when Stripe confirms payment, then the booking is confirmed exactly once and the payment reference is stored.

**AC2 — Error or edge behaviour:** Given a failed or cancelled payment or repeated callback, when the system processes it, then no duplicate charge or duplicate confirmation occurs.

**AC3 — Screenshot alignment:** Final booking screen shows real reference/status, room/dates/nights/guests, line items/currency and supported masked provider details only after authoritative confirmation. Pending/failed payment or delayed webhook has honest recovery state; redirects alone cannot claim reservation success. Print has a usable print view. PDF needs an agreed guest-authorized document contract, or an explained unavailable state with recorded follow-up; modify/cancel integrate under #29.

### Technical Notes

Build the frontend payment step and server payment flow using Stripe test mode, server-side verification and idempotency. Do not store card details or trust a browser success redirect alone.

Owns Payment milestone and final supplied booking screen. Preserve full-payment/deposit support despite the screenshot showing one total. Card-brand artwork is not raw-card processing. Use authenticated status reads, webhook verification and idempotency. Coordinate PDF/status with #06 and email state with #26; do not promise actual email delivery from a browser redirect.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] UI and integration: full and deposit success; negative: failure and replayed callback.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

- [ ] Screenshot/integration checks: Confirmation content/line items, forged redirect, delayed webhook, pending/failure/refresh, full/deposit amounts, print and supported/unsupported authorized PDF.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 16 hours (revised planning estimate after screenshot review; confirm with the assignee).

### Dependencies

Blocked by: DDP-#22, DDP-#23, DDP-#24; provider and booking-status/document contracts.

---

## [DDP-#26] feat(email): send booking confirmation after payment

**Assignee:** TBD  
**Labels:** `epic:integration`, `High`, `feat`  
**Sprint milestone:** Sprint 7  
**Priority:** High  
**Phase:** Development

### User Story

As a guest, I want an email receipt so that I have my booking details.

### Background / Context

- SRS Reference: SRS HW-12
- SDS Reference: SDS §4.1, §7.4
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given a confirmed booking, when payment succeeds, then one confirmation email includes reference ID, room type, dates and paid amount.

**AC2 — Error or edge behaviour:** Given email provider failure, when delivery is attempted, then the paid booking remains recorded and the failure is logged for retry.

**AC3 — Screenshot alignment:** Email and final reservation view agree on reference, room, dates, currency, paid amount and balance. Queued/failed email does not invalidate a paid booking or cause false delivered claims. Pre-arrival instructions/contacts are approved, not sample content.

### Technical Notes

Use SendGrid sandbox outside production. Avoid duplicate emails from repeated payment events.

Use confirmed reservation data; payment failure must not generate success email. Repeated callbacks cannot generate duplicate mail.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] Integration: email content and single send; negative: provider failure and retry.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

- [ ] Screenshot/integration checks: Email/final-screen consistency, deposit/balance correctness, no email before confirmation and honest delivery-failure state.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 6 hours

### Dependencies

Blocked by: DDP-#25

---

## [DDP-#27] feat(bookings): show guest booking dashboard

**Assignee:** TBD  
**Labels:** `epic:core-features`, `High`, `feat`  
**Sprint milestone:** Sprint 7  
**Priority:** High  
**Phase:** Development

### User Story

As a guest, I want upcoming and past reservations so that I can track my stays.

### Background / Context

- SRS Reference: SRS HW-13
- SDS Reference: SDS §5.2.1, §6.2
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given a signed-in guest, when I open My Bookings, then only my upcoming and past bookings are shown with status and dates.

**AC2 — Error or edge behaviour:** Given another guest's booking ID, when I request it, then access is denied and no private data is returned.

**AC3 — Screenshot alignment:** Profile is My Bookings: signed-in header/sidebar/sign-out, summary tiles, Upcoming/Past/Cancelled tabs, rows with room thumbnails, dates, status, price/currency and details. Counts derive from guest records. Loyalty/member metrics need a service; omit or explain unsupported values rather than invent them.

### Technical Notes

Enforce ownership in backend, not only in the UI. Agree booking state names with front desk.

Use guest-authorized detail/status reads shared with confirmation where appropriate; sign-out follows session invalidation rules. #29 owns working modify/cancel controls. Do not use screenshot guest identities or fake membership balances.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] Integration: own list; security: cross-guest access denied; UI: empty state.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

- [ ] Screenshot/integration checks: Tabs/counts/details, empty/failure state, missing image, sign-out, cross-guest denial and unsupported loyalty state.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 12 hours (revised planning estimate after screenshot review; confirm with the assignee).

### Dependencies

Blocked by: DDP-#10, DDP-#20, DDP-#22, DDP-#25.

---

## [DDP-#28] feat(bookings): modify or cancel eligible bookings

**Assignee:** TBD  
**Labels:** `epic:core-features`, `High`, `feat`  
**Sprint milestone:** Sprint 7  
**Priority:** High  
**Phase:** Development

### User Story

As a guest, I want to change or cancel in time so that I can manage my plans.

### Background / Context

- SRS Reference: SRS HW-14; §6.1 rule 2
- SDS Reference: SDS §5.2.1 Figure 17, §4.1
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given my booking is more than 24 hours before check-in, when I make a valid change or cancellation, then the new state is saved and a change email is sent.

**AC2 — Error or edge behaviour:** Given my booking is inside the 24-hour limit or belongs to another guest, when I request a change, then it is rejected without changing the booking.

**AC3 — Screenshot alignment:** Changes return authoritative dates, price/payment/refund state and booking status so Profile and confirmation agree. Repeated requests/provider errors cannot duplicate refunds or claim unperformed cancellation.

### Technical Notes

Apply the approved cancellation policy and any payment/refund rules agreed with hotel management. Recheck availability on date changes.

Confirm exact 24-hour cutoff/timezone, eligible states, deposit/refund and change rules against approved policy under #06; screenshot marketing is not authoritative policy. #26 supplies email delivery.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] Integration: eligible change and cancel; negative: late and cross-guest requests.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

- [ ] Screenshot/integration checks: Cutoff boundary/timezone, repricing, duplicate cancellation, refund/provider failure and cross-view consistency.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 10 hours

### Dependencies

Blocked by: DDP-#17, DDP-#25, DDP-#26, DDP-#27; approved modification/refund policy.

---

## [DDP-#29] feat(frontend): add booking changes to guest dashboard

**Assignee:** TBD  
**Labels:** `epic:ui-frontend`, `High`, `feat`  
**Sprint milestone:** Sprint 7  
**Priority:** High  
**Phase:** Development

### User Story

As a guest, I want clear change and cancel controls so that I can manage eligible bookings.

### Background / Context

- SRS Reference: SRS HW-13, HW-14
- SDS Reference: SDS §5.2.1 Figure 17
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given an eligible upcoming booking, when I open it, then I can start a permitted date change or cancellation and see the result.

**AC2 — Error or edge behaviour:** Given an ineligible or failed request, when I open it, then the UI explains why it cannot be changed and keeps the current state.

**AC3 — Screenshot alignment:** Profile rows and final confirmation expose consistent eligible View/Modify/Cancel actions. Cancellation has explicit review/confirmation including real fee/refund outcome. Successful changes refresh both views; failed requests preserve actual booking data.

### Technical Notes

The server is authoritative for eligibility; do not rely on hidden buttons as the only rule.

No modify/cancel dialog screenshot was supplied; document a simple accessible form/dialog design adaptation. Print/PDF use #25 support rather than duplicate document/payment logic.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] UI: eligible actions; negative: 24-hour cutoff and server rejection.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

- [ ] Screenshot/integration checks: Both entry points, cancellation confirmation/back-out, refreshed totals/status, focus return, cutoff and server rejection.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 6 hours

### Dependencies

Blocked by: DDP-#23, DDP-#25, DDP-#27, DDP-#28.

---

## [DDP-#30] test(integration): cover booking and cross-service contracts

**Assignee:** TBD  
**Labels:** `epic:testing`, `High`, `test`  
**Sprint milestone:** Sprint 7  
**Priority:** High  
**Phase:** Development

### User Story

As a developer, I want integration tests so that changes across services do not break reservations.

### Background / Context

- SRS Reference: SRS HW-03, HW-05, HW-08–HW-14
- SDS Reference: SDS §1.4.1, §1.5.2, §4.1, §7.5.2
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given seeded test data, when the integration suite runs, then room lookup, availability, booking, promo, payment and email contracts pass.

**AC2 — Error or edge behaviour:** Given a missing or changed response field, when the suite runs, then the relevant contract test fails.

**AC3 — Screenshot alignment:** Fixtures also cover image URLs, supported occupancy/quantity/add-ons, offer marketing versus validation, quote refresh/line items and guest-scoped confirmation/Profile status reads. Unsupported contract fields remain named gaps.

### Technical Notes

Use test DB, Stripe test fixtures and email sandbox/mocks; coordinate gateway and manager mocks.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] Contract: success payloads; negative: changed payload and error response; integration: critical booking flow.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

- [ ] Screenshot/integration checks: Room image/price contracts, public offer metadata, enquiry failure, pending-to-confirmed transition, quote consistency and cross-view ownership.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 9 hours

### Dependencies

Blocked by: DDP-#15, DDP-#16, DDP-#24–DDP-#29; agreed gateway/manager/provider fixtures.

---

## [DDP-#31] test(e2e): automate visitor-to-booking journey

**Assignee:** TBD  
**Labels:** `epic:testing`, `High`, `test`  
**Sprint milestone:** Sprint 7  
**Priority:** High  
**Phase:** Development

### User Story

As a developer, I want a browser test so that the main guest journey works end to end.

### Background / Context

- SRS Reference: SRS HW-01, HW-03, HW-06–HW-13
- SDS Reference: SDS §5.2.1 Figures 14–17
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given a test environment, when a guest browses rooms, registers, logs in, books and completes test payment, then a confirmed booking appears in My Bookings.

**AC2 — Error or edge behaviour:** Given a sold-out room or failed payment, when the journey runs, then no confirmed booking is shown.

**AC3 — Screenshot alignment:** Browser journey starts on Home/Rooms, retains dates through registration/login, selects/configures rooms, applies an offer, enters guest details, pays in test mode, opens confirmed reservation and finds it in Profile. Five milestones correspond to the four supplied booking screens.

### Technical Notes

Use test accounts and Stripe test mode only; make fixtures repeatable.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] E2E: successful journey; negative: sold-out and payment failure.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

- [ ] Screenshot/integration checks: Safe return after auth, back/refresh, repricing, payment pending/retry, no success on forged redirect, print view and Profile consistency.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 8 hours

### Dependencies

Blocked by: DDP-#16, DDP-#18, DDP-#19, DDP-#20, DDP-#23–DDP-#27.

---

## [DDP-#32] test(quality): verify responsive and accessible website

**Assignee:** TBD  
**Labels:** `epic:testing`, `High`, `test`  
**Sprint milestone:** Sprint 8  
**Priority:** High  
**Phase:** Development

### User Story

As a visitor, I want usable pages on my device so that I can complete a booking.

### Background / Context

- SRS Reference: SRS HW-17; NFR-08
- SDS Reference: SDS §5.1, §5.2.1
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given 320px mobile, tablet and desktop widths, when key pages are opened, then content and controls fit and booking can be completed.

**AC2 — Error or edge behaviour:** Given keyboard-only use, when I navigate forms and calendars, then focus, labels and error messages are usable.

**AC3 — Screenshot alignment:** Compare Home, Rooms, Services, Contact, Offers, Profile, Sign In/Up and all booking screens with the saved catalogue at mobile/tablet/desktop widths. Verify full Home scroll, card crops, navigation, map fallback, calendar/stepper/comparison focus, FAQ, cookie notice and balanced scrollbar layout. Document approximations where fonts/assets/mobile frames are absent.

### Technical Notes

Check core pages and booking flow at representative viewport sizes; use accessible text for availability states.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] Browser: viewport checks; accessibility: keyboard and form error checks.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

- [ ] Screenshot/integration checks: All catalogue screens at 320px/tablet/desktop, zoom/reflow, contrast, reduced motion, focus/errors/state announcements, blocked map/image and no horizontal overflow.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 8 hours

### Dependencies

Blocked by: DDP-#12–DDP-#29

---

## [DDP-#33] test(security): review guest access and payment boundaries

**Assignee:** TBD  
**Labels:** `epic:security`, `High`, `test`  
**Sprint milestone:** Sprint 8  
**Priority:** High  
**Phase:** Development

### User Story

As a guest, I want my account and payment details protected so that I can trust online booking.

### Background / Context

- SRS Reference: SRS NFR-10, NFR-12, NFR-13; HW-06–HW-14
- SDS Reference: SDS §6.1–6.5
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given a guest token, when protected APIs are called, then only that guest's records are accessible and invalid tokens are rejected.

**AC2 — Error or edge behaviour:** Given a payment or log event, when stored data is inspected, then card details, plaintext passwords and secrets are absent.

**AC3 — Screenshot alignment:** Profile, reservation status/documents and modify/cancel deny cross-guest access. Untrusted image URLs, return URLs, enquiries and promo input follow agreed validation. Social/recovery and card-brand UI cannot bypass auth/provider boundaries.

### Technical Notes

Review validation, rate limits with gateway owner, TLS through gateway, and secret handling. Record fixes as separate issues if needed.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] Security: cross-guest access, invalid JWT, injection/XSS input and sensitive-data checks.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

- [ ] Screenshot/integration checks: Status/document ownership, unsafe URLs, enquiry abuse, replayed payment/cancel and no sensitive browser persistence/logs.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 8 hours

### Dependencies

Blocked by: DDP-#25, DDP-#28

---

## [DDP-#34] test(performance): measure website booking load

**Assignee:** TBD  
**Labels:** `epic:performance`, `Medium`, `test`  
**Sprint milestone:** Sprint 8  
**Priority:** Medium  
**Phase:** Development

### User Story

As a guest, I want room search and booking to stay responsive during busy periods.

### Background / Context

- SRS Reference: SRS NFR-14; HW-03, HW-08–HW-09
- SDS Reference: SDS §1.5.1, §7.5.2
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given a staging-like environment, when agreed concurrent room-search and booking traffic runs, then results and error rates are recorded against the team's NFR-14 target.

**AC2 — Error or edge behaviour:** Given two guests competing for the last room, when load runs, then at most one booking can reserve it.

### Technical Notes

Coordinate a realistic 300-user system-wide test with infra; record hardware, dataset and any bottlenecks.

Include photo-heavy public pages, calendar queries and quote-refresh traffic. Measure optimized image loading/payloads, gateway/manager timeout effects and real last-room contention instead of sample-only inventory.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] Load: room search and booking metrics; concurrency: last-room protection.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

- [ ] Screenshot/integration checks: Image delivery, availability/calendar and quote refresh performance alongside original concurrency/load targets.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 7 hours

### Dependencies

Blocked by: DDP-#30, DDP-#31

---

## [DDP-#35] ci(deployment): add hotel website staging release and smoke checks

**Assignee:** TBD  
**Labels:** `epic:ci-cd`, `High`, `ci`  
**Sprint milestone:** Sprint 8  
**Priority:** High  
**Phase:** Development

### User Story

As a developer, I want a controlled staging release so that the website can be checked before production.

### Background / Context

- SRS Reference: SRS NFR-19
- SDS Reference: SDS §7.4–7.5.3
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given a reviewed release, when the pipeline deploys the hotel website images to staging, then health and critical guest-route smoke checks pass.

**AC2 — Error or edge behaviour:** Given a failed health or smoke check, when deployment runs, then the release is marked failed and the previous working image can be restored.

### Technical Notes

Coordinate gateway routes, registry and staging credentials with infra. Production deployment remains approval-gated per SDS.

Staging smoke includes implemented catalogue routes/images, gateway config, protected Profile/confirmation redirects and payment-return status checks. Unsupported features remain explicit rather than false-success controls.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] Pipeline: staging success; negative: failed smoke check and rollback rehearsal.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

- [ ] Screenshot/integration checks: Public route/image availability, unknown-route 404, protected guest routes, payment-return status and rollback.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 9 hours

### Dependencies

Blocked by: DDP-#07, DDP-#30, DDP-#31; infra staging environment

---

## [DDP-#36] docs(release): finish website README, API docs and demo evidence

**Assignee:** TBD  
**Labels:** `epic:documentation`, `Medium`, `docs`  
**Sprint milestone:** Sprint 8  
**Priority:** Medium  
**Phase:** Development

### User Story

As a teammate, I want clear setup and release notes so that the website can be maintained and demonstrated.

### Background / Context

- SRS Reference: SRS HW-01–HW-17
- SDS Reference: SDS §1.1, §5.2.1, §7.5
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given a fresh checkout, when a teammate follows the README, then they can run the website and its tests with sample environment values.

**AC2 — Error or edge behaviour:** Given the final demo, when the website is shown, then requirements HW-01 through HW-17 have linked issues, tests or a clearly recorded gap.

**AC3 — Screenshot alignment:** Each screen/control maps to an owning issue, test evidence or named unresolved decision. Document Home-only background, four booking screens/five milestones, substitute assets, API rooms and deferred social/recovery/newsletter/loyalty/add-on/PDF features without claiming they shipped.

### Technical Notes

Include architecture, gateway dependencies, API examples, test commands and staging URL when available. Record approved SDS deviations in ADRs.

Design reference: [screen catalogue](frontend/SCREEN_CATALOGUE.md); see [backlog alignment](documents/planning/screenshot-backlog-alignment.md) for ownership and pending contract decisions.

### Test Requirements

- [ ] Documentation check: teammate setup walk-through; traceability check: each HW requirement mapped.
- [ ] AC1: Attach the passing test or documented manual check for expected behaviour.
- [ ] AC2: Attach the passing test or documented manual check for the error or edge case.

- [ ] Screenshot/integration checks: Catalogue-to-issue traceability, approved/deferred feature states and removal/labeling of sample production content.

### Definition of Done

- [ ] Code or documentation follows team standards; no new lint errors
- [ ] Acceptance-criteria checks listed above pass; relevant integration checks pass
- [ ] New code reaches the course coverage target (≥80%) where coverage applies
- [ ] PR targets `develop`, receives at least one peer approval, and resolves review comments
- [ ] CI passes (build, lint, test); API docs updated if an endpoint changed
- [ ] Commit messages link this GitHub issue

### Estimate

Estimated: 6 hours

### Dependencies

Blocked by: DDP-#30–DDP-#35; approved final hotel content/assets and owner decisions.

---
