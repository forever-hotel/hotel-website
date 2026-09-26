<!--
Title format: type(scope): summary   e.g. feat(bookings): reject bookings for unavailable room types
Target branch: develop (never main directly). Keep PRs small; open within 5 working days of starting the branch.
-->

## Summary
<!-- What does this PR change, and why? -->

## Linked issue
Closes #

## Traceability
- SRS requirement(s): <!-- e.g. HW-09, NFR-01 -->
- SDS section: <!-- e.g. 6.4 Input Validation -->
- ADR: <!-- e.g. ADR-03, or "n/a" -->

## How to test
<!-- Steps a reviewer can follow locally, including any .env variables needed (names only, never values). -->
1.

## Screenshots / API examples
<!-- UI screenshots, or request/response examples for new or changed endpoints. Remove if not relevant. -->

## Definition of Done
- [ ] Acceptance criteria in the linked issue are all met
- [ ] Linter and formatter pass (`npm run lint`, `npm run format:check`)
- [ ] Unit tests written for all new logic; all tests pass
- [ ] Integration tests written for new or changed API endpoints
- [ ] Coverage on new code >= 80% (`npm run test:cov`)
- [ ] No hardcoded secrets, credentials, or personal data (including in tests and logs)
- [ ] New environment variables added to `.env.example` with placeholder values
- [ ] Schema changes delivered as a migration (no `DB_SYNCHRONIZE` on shared databases)
- [ ] API documentation updated (if an endpoint was added or modified)
- [ ] `CHANGELOG.md` updated under `[Unreleased]`
- [ ] Commits follow Conventional Commits and reference the issue

## Notes for reviewers
<!--
Reviewers: prefix comments with [blocker], [suggestion], [question] or [nit].
Authors: do not resolve a reviewer's comment yourself; the reviewer resolves it after checking the change.
-->
