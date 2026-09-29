---
name: Development issue
about: A feature or technical task for the development phase (SENG 34213 §4.3)
title: "[DDP-#] type(scope): summary"
labels: ""
assignees: ""
---

<!--
Before submitting, set on the project board: Assignee, Priority label, Epic label (epic:api, epic:auth, ...),
Sprint milestone, Estimate, and Phase = Development.
-->

## User Story
As a [role], I want to [action] so that [benefit].

## Background / Context
<!-- Reference the SRS requirement and SDS design element that drive this ticket. Never implement without traceable design. -->
- SRS Reference: <!-- e.g. HW-09 -->
- SDS Reference: <!-- e.g. Section 6.4, Class Booking -->
- ADR Reference: <!-- if applicable -->

## Acceptance Criteria
<!-- BDD scenarios. Each AC must have a corresponding test case. -->

### AC1: Happy Path
**Given** [precondition]
**When** [action]
**Then** [expected outcome]

### AC2: Error Handling
**Given** [invalid input or error condition]
**When** [action]
**Then** [HTTP status] with body `{ "error": "ERROR_CODE", "message": "..." }`

### AC3: Edge Case
**Given** [boundary condition]
**When** [action]
**Then** [expected outcome]

## Technical Notes
<!-- Implementation guidance: patterns to follow, libraries, known pitfalls, constraints. -->

## Test Requirements
- [ ] Unit test: <what is being tested>
- [ ] Integration test: <what is being tested>
- [ ] Negative test: <what error condition is being tested>

## Definition of Done
- [ ] Code implemented and follows team coding standards
- [ ] All Acceptance Criteria unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Code coverage for new code >= 80%
- [ ] PR raised against `develop`
- [ ] At least 1 peer code review completed; all comments resolved
- [ ] No new linting errors introduced
- [ ] CI pipeline passes (build, lint, test)
- [ ] API documentation updated (if endpoint added/modified)
- [ ] CHANGELOG.md updated under [Unreleased]
- [ ] Issue linked in commit messages (`Closes #XX`)

## Estimate
Estimated: X hours

## Dependencies
Blocked by: #<issue-number>
