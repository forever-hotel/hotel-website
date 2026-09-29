# GitHub issue draft: hotel website API contracts

Use the actual GitHub issue number in the title after creating the issue.
DDP-#06 is the backlog identifier; #45 belongs to the frontend scaffold.

**Title:** `[DDP-#<actual-number>] docs(architecture): agree hotel website API contracts`

Suggested metadata from the backlog: `epic:api`, `High`, `docs`; Sprint 5;
Phase: Development; assignee: TBD; estimate: 6 hours.

## User Story

As a website developer, I want agreed API request and response shapes so that
the frontend and backend integrate consistently with the other services.

## Background / Context

- Backlog: DDP-#06 in `issue.md`.
- Contract draft: [hotel-website-contracts.md](hotel-website-contracts.md).
- SRS references: HW-01, HW-03, HW-05–HW-14, CI-01; verify against the approved SRS.
- SDS references: §§1.1, 1.4.1, 1.5.2, 4.1, based on repository summaries.
- ADR: none assigned; record significant design decisions in the team's ADR location.
- Current implementation provides `/health` and shared validation/error handling.
  Business endpoints in this document are proposed, not implemented.

## Acceptance Criteria

### AC1: Contract coverage and ownership

**Given** the draft contracts, **when** the website and relevant service owners
review them, **then** rooms, availability, guest auth, bookings, promotions and
payments each have agreed paths, request/response examples, named owners and
recorded approval evidence.

### AC2: Error handling

**Given** unavailable inventory or an invalid promotion, **when** the contracts
are reviewed, **then** they define explicit HTTP statuses and stable
`{ "error", "message" }` bodies, consistent with the shared backend format.

### AC3: Integration boundaries

**Given** expired sessions, cross-guest access, concurrent reservations, duplicate
payment events or late payment, **when** owners review the contracts, **then**
authentication, inventory ownership, retries and reconciliation behavior are
documented without relying on browser-supplied identity or payment success.

### AC4: Outstanding decisions

**Given** the decision log D1–D9, **when** the issue is completed, **then** every
decision has a named approver and linked evidence; no proposed contract is
represented as an approved or deployed API without verification.

## Technical Notes

- Browser traffic goes through the shared API Gateway.
- Confirm gateway paths and auth/session ownership with Gateway/Auth.
- Confirm maintenance, inventory reservation and booking changes with Front Desk.
- Confirm promotion publication and redemption ownership with Manager Dashboard.
- Agree hosted vs embedded checkout, deposits, refunds and cancellation cutoff.
- Keep money in integer LKR minor units and define date/time boundaries explicitly.
- Preserve the current error body; separately agree structured field errors.
- This issue delivers documentation and agreement. Business endpoint code and
  runtime integration tests belong to the dependent feature issues.

## Test Requirements

- [ ] Review each endpoint's request, success and error example.
- [ ] Check that all JSON examples parse and documentation links resolve.
- [ ] Review unavailable-room and invalid-promo scenarios against AC2.
- [ ] Review ownership, retry, concurrency and late-payment scenarios against AC3.
- [ ] Verify SRS/SDS references and attach named-owner approvals for AC1 and AC4.
- Unit/integration coverage: not applicable to this documentation-only change;
  do not claim runtime API tests have passed.

## Definition of Done

- [ ] Contracts cover all six required areas with named owners.
- [ ] All acceptance criteria and review checks are satisfied.
- [ ] D1–D9 decisions are resolved and approval evidence is recorded.
- [ ] README/backlog links and changelog are updated.
- [ ] Documentation formatting passes.
- [ ] PR receives at least one peer review and passes applicable CI.
- [ ] PR targets the agreed integration branch (`develop` in the template;
      confirm the team's current use of `pre-develop`).
- [ ] Conventional Commit references the actual GitHub issue number.

## Estimate

Estimated: 6 hours.

## Dependencies

Blocked by DDP-#01 (replace with its actual GitHub issue link) and availability
of Gateway/Auth, Front Desk, Manager Dashboard and hotel policy reviewers.

## Current progress

Contract draft and review checklist are prepared. Cross-team decisions and
named-owner sign-offs are pending. Keep the issue open until agreement is recorded.
