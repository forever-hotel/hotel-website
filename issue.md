# Hotel Website development issues

Copy each issue below into **hotel-website** GitHub Issues. These are draft tickets, not issues already created on GitHub.

## How to use this file

1. Create or confirm the existing project board and Sprint 5–8 milestones with the team. Use **Phase: Development** on every ticket.
2. Create tickets in the numbered order. `DDP-#NN` is a **draft ticket ID**, not a real GitHub issue number. Replace it with your team's assigned DDP ID if different, and replace dependency IDs with real `#issue-number` links after creation.
3. Set the **Assignee** to the person actually doing the work. The suggested `epic:*` and priority values are project-board metadata; match your team's existing labels.
4. Create one `feature/<GitHub-issue-number>-<slug>` branch per issue. Open PRs against `develop`. Split any ticket that grows beyond five working days.
5. Confirm the shared API gateway, authentication, room-status, promotions, and infrastructure owners before starting tickets that depend on them. Those components are outside this repo.

The course guide calls development sprints **Sprint 5–8** (PDF pages 6–7). It asks for issue titles, user stories, SRS/SDS references, acceptance criteria, technical notes, tests, Definition of Done, estimates, dependencies, assignee, labels, sprint, priority and phase (PDF pages 13–17). The SDS describes Next.js, NestJS, shared PostgreSQL, gateway routing, and staged CI/CD (SDS §§1, 2, 7.5). No date or GitHub issue number is invented here.

## Suggested creation order

| Sprint | Focus | Draft tickets |
| --- | --- | --- |
| 5 | Foundation and infrastructure | DDP-#01–DDP-#10 |
| 6 | Core website features | DDP-#11–DDP-#22 |
| 7 | Integration and user journeys | DDP-#23–DDP-#31 |
| 8 | Quality and release | DDP-#32–DDP-#36 |

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

**AC1 — Expected behaviour:** Given the Dockerfiles, when images are built, then frontend and backend images build successfully.

**AC2 — Error or edge behaviour:** Given local configuration, when the containers start, then health checks pass without exposing backend or database publicly.

### Technical Notes

Coordinate Compose networking and gateway routes with infra. Use environment variables for secrets.

### Test Requirements

- [ ] Build check: both images build; smoke check: services answer health requests.
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

Blocked by: DDP-#03, DDP-#04

---

## [DDP-#08] build(data): add versioned guest and room schema migrations

**Assignee:** TBD  
**Labels:** `epic:data-layer`, `High`, `build`  
**Sprint milestone:** Sprint 5  
**Priority:** High  
**Phase:** Development

### User Story

As a developer, I want controlled guest and room data tables so that account and room features have a reliable base.

### Background / Context

- SRS Reference: SRS HW-03, HW-06, §13.1; NFR-16
- SDS Reference: SDS §2.1–2.2, §1.5.2
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given an empty test database, when migrations run, then guest and room-related tables and constraints are created.

**AC2 — Error or edge behaviour:** Given a duplicate guest email or invalid room type reference, when data is inserted, then the database rejects it.

### Technical Notes

Confirm table ownership and prefixes with other services before changing shared PostgreSQL schema. Use versioned migrations, not synchronize in production.

### Test Requirements

- [ ] Migration test: clean apply; negative test: duplicate or invalid data rejected.
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

### Technical Notes

Promotion data is owned by manager dashboard; consume the agreed read contract and allow a non-blocking empty state.

### Test Requirements

- [ ] UI: main content renders; integration: active offer shown; negative: empty offer response handled.
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

Blocked by: DDP-#04, DDP-#06

---

## [DDP-#13] feat(frontend): build About Us page

**Assignee:** TBD  
**Labels:** `epic:ui-frontend`, `High`, `feat`  
**Sprint milestone:** Sprint 6  
**Priority:** High  
**Phase:** Development

### User Story

As a visitor, I want hotel background and location so that I can decide whether to visit.

### Background / Context

- SRS Reference: SRS HW-02
- SDS Reference: SDS §5.1
- ADR Reference: None known; create one if implementation significantly changes the approved SDS.

### Acceptance Criteria

**AC1 — Expected behaviour:** Given approved hotel content, when I open About Us, then history, facilities and policies are readable.

**AC2 — Error or edge behaviour:** Given a slow or blocked map embed, when I open About Us, then the address and page content remain usable.

### Technical Notes

Use approved hotel facts and the agreed Google Maps location; avoid inventing policies.

### Test Requirements

- [ ] UI: content present; negative: map failure leaves address accessible.
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

Blocked by: DDP-#04

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

### Technical Notes

Use approved descriptions and images. Do not imply a facility is bookable online unless the SRS says so.

### Test Requirements

- [ ] UI: required facilities listed; negative: missing image fallback.
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

Blocked by: DDP-#04

---

## [DDP-#15] feat(frontend): add FAQ and contact form

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

**AC1 — Expected behaviour:** Given approved FAQs, when I open the FAQ section, then questions and answers are readable and accessible.

**AC2 — Error or edge behaviour:** Given a valid contact request, when I submit the form, then management receives an email and I see a success message; invalid input is rejected.

### Technical Notes

Confirm management recipient and email provider with the team. Protect against abuse with rate limits at the gateway.

### Test Requirements

- [ ] UI: FAQ and success state; integration: email dispatch; negative: invalid email and provider failure.
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

Blocked by: DDP-#04, DDP-#06

---

## [DDP-#16] feat(frontend): build room listing and detail pages

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

**AC1 — Expected behaviour:** Given room data, when I open Rooms, then room types show images, amenities, price per night and current availability indicator.

**AC2 — Error or edge behaviour:** Given an empty or failed room response, when I open Rooms, then I see a useful message instead of a broken page.

### Technical Notes

Consume the agreed catalogue API. Show currency and price basis clearly.

### Test Requirements

- [ ] UI: catalogue renders; integration: API data displayed; negative: empty and failed response states.
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

Blocked by: DDP-#11

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

### Technical Notes

Coordinate room blocks and status with front desk owner. Define timezone, date boundaries and response shape in contract.

### Test Requirements

- [ ] Integration: available and occupied dates; negative: invalid range and blocked date.
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

### Technical Notes

Use catalogue data as the single source of room details.

### Test Requirements

- [ ] UI: compare two and three; edge: fourth selection blocked.
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

Blocked by: DDP-#16

---

## [DDP-#19] feat(frontend): show room availability calendar

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

**AC1 — Expected behaviour:** Given a room type, when I open its calendar, then available and blocked dates are visually distinct and labelled for screen readers.

**AC2 — Error or edge behaviour:** Given an API error or no dates, when I open the calendar, then I see a clear retry or empty state.

### Technical Notes

Use date-based API data and avoid treating cached availability as a booking guarantee.

### Test Requirements

- [ ] UI: date states and keyboard access; negative: API failure state.
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

Blocked by: DDP-#17

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

**AC1 — Expected behaviour:** Given valid registration or login data, when I submit the correct form, then I reach the expected signed-in page.

**AC2 — Error or edge behaviour:** Given invalid input or credentials, when I submit, then field or server errors are shown without leaking sensitive details.

### Technical Notes

Follow the team session approach agreed with the auth/gateway owner; do not persist raw passwords.

### Test Requirements

- [ ] UI: success routes; negative: invalid form and 401 handling.
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

Blocked by: DDP-#09, DDP-#10

---

## [DDP-#21] feat(bookings): add booking and payment data migrations

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

**AC1 — Expected behaviour:** Given a clean database, when migrations run, then booking and payment tables, relationships and statuses exist.

**AC2 — Error or edge behaviour:** Given an invalid guest or room reference, when a booking is inserted, then the database rejects it.

### Technical Notes

Confirm ownership with front desk and shared DB maintainers. Payment records store provider references, never card data.

### Test Requirements

- [ ] Migration: clean apply; negative: invalid foreign keys and status constraints.
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

### Technical Notes

Recheck availability in a transaction. A pending reservation is not confirmed until Stripe confirms payment.

### Test Requirements

- [ ] Unit: pricing and date rules; integration: create booking; concurrency: last-room race; negative: overlap.
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

Estimated: 10 hours

### Dependencies

Blocked by: DDP-#10, DDP-#17, DDP-#21

---

## [DDP-#23] feat(frontend): build room booking steps

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

**AC1 — Expected behaviour:** Given a selected room, when I choose dates, guests and requests, then the room selection and guest details steps show a quote before payment.

**AC2 — Error or edge behaviour:** Given invalid dates or a sold-out result, when I continue, then the form explains the problem and keeps safe inputs.

### Technical Notes

Use the real booking quote API. Show Room Selection, Guest Details and Payment progress.

### Test Requirements

- [ ] UI: complete valid steps; negative: unavailable room and invalid date.
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

Blocked by: DDP-#19, DDP-#20, DDP-#22

---

## [DDP-#24] feat(promotions): read and apply manager promo codes

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

**AC1 — Expected behaviour:** Given an active applicable code, when I apply it, then the server returns the reduced total and the UI shows the discount.

**AC2 — Error or edge behaviour:** Given expired, inactive, exhausted or inapplicable code, when I apply it, then no discount is applied and I see a clear error.

### Technical Notes

Manager dashboard owns creation and activation; use its published contract. Calculate final totals on the server.

### Test Requirements

- [ ] Integration: valid percent and fixed discounts; negative: inactive and expired codes.
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

Blocked by: DDP-#06, DDP-#22; manager promotion API

---

## [DDP-#25] feat(payments): integrate Stripe test checkout

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

### Technical Notes

Build the frontend payment step and server payment flow using Stripe test mode, server-side verification and idempotency. Do not store card details or trust a browser success redirect alone.

### Test Requirements

- [ ] UI and integration: full and deposit success; negative: failure and replayed callback.
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

Estimated: 10 hours

### Dependencies

Blocked by: DDP-#22, DDP-#24

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

### Technical Notes

Use SendGrid sandbox outside production. Avoid duplicate emails from repeated payment events.

### Test Requirements

- [ ] Integration: email content and single send; negative: provider failure and retry.
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

### Technical Notes

Enforce ownership in backend, not only in the UI. Agree booking state names with front desk.

### Test Requirements

- [ ] Integration: own list; security: cross-guest access denied; UI: empty state.
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

Blocked by: DDP-#10, DDP-#22

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

### Technical Notes

Apply the approved cancellation policy and any payment/refund rules agreed with hotel management. Recheck availability on date changes.

### Test Requirements

- [ ] Integration: eligible change and cancel; negative: late and cross-guest requests.
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

Estimated: 10 hours

### Dependencies

Blocked by: DDP-#17, DDP-#25, DDP-#27

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

### Technical Notes

The server is authoritative for eligibility; do not rely on hidden buttons as the only rule.

### Test Requirements

- [ ] UI: eligible actions; negative: 24-hour cutoff and server rejection.
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

Blocked by: DDP-#27, DDP-#28

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

### Technical Notes

Use test DB, Stripe test fixtures and email sandbox/mocks; coordinate gateway and manager mocks.

### Test Requirements

- [ ] Contract: success payloads; negative: changed payload and error response; integration: critical booking flow.
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

Estimated: 9 hours

### Dependencies

Blocked by: DDP-#24–DDP-#29

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

### Technical Notes

Use test accounts and Stripe test mode only; make fixtures repeatable.

### Test Requirements

- [ ] E2E: successful journey; negative: sold-out and payment failure.
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

Blocked by: DDP-#23–DDP-#27

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

### Technical Notes

Check core pages and booking flow at representative viewport sizes; use accessible text for availability states.

### Test Requirements

- [ ] Browser: viewport checks; accessibility: keyboard and form error checks.
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

### Technical Notes

Review validation, rate limits with gateway owner, TLS through gateway, and secret handling. Record fixes as separate issues if needed.

### Test Requirements

- [ ] Security: cross-guest access, invalid JWT, injection/XSS input and sensitive-data checks.
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

### Test Requirements

- [ ] Load: room search and booking metrics; concurrency: last-room protection.
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

### Test Requirements

- [ ] Pipeline: staging success; negative: failed smoke check and rollback rehearsal.
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

### Technical Notes

Include architecture, gateway dependencies, API examples, test commands and staging URL when available. Record approved SDS deviations in ADRs.

### Test Requirements

- [ ] Documentation check: teammate setup walk-through; traceability check: each HW requirement mapped.
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

Blocked by: DDP-#30–DDP-#35

---
