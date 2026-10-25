# Test, demo and handover evidence (DDP-#36)

Use [setup](setup.md) for a fresh checkout, [API examples](api.md) for requests
and [traceability](traceability.md) for requirement/screen ownership. Demo time
does not replace code review, CI, content approval or staging verification.

## Verification commands

From the repository root, run `node scripts/check-release-docs.mjs` to verify
curated local documentation links, matrix coverage and referenced package scripts.
Formatting uses the installed backend Prettier:

```powershell
cd backend
npx prettier --check ../README.md ../frontend/README.md ../documents/release ../frontend/SCREEN_CATALOGUE.md ../documents/planning/screenshot-backlog-alignment.md
npm run build
npm run lint
npm run format:check
node node_modules/jest/bin/jest.js --runInBand --coverage
npm run test:contracts
npm run test:security
```

The last two commands need the configured disposable database and use temporary
table copies/mocked payment and email. Do not interpret them as live provider
results. Full DB integration is `npm run test:integration`; the pooled concurrency
suite is intentionally gated to a disposable localhost CI database. See
[HTTP contracts](../testing/booking-contracts.md) and
[security verification](../testing/security-review.md).

From `frontend` after installing dependencies:

```powershell
npm run build
npm run lint
npm run format:check
npm run typecheck
npm test
npm run test:coverage
npm run test:e2e
npm run test:quality
```

Browser runs require Chrome/Edge. E2E covers the guest journey with a fixture API;
quality adds screenshots, axe and keyboard checks. Artifacts are under
`frontend/.test-artifacts/` locally and uploaded by frontend CI. Keep actual
test-run results with the release SHA rather than copying historical pass counts.

From `performance`, run `npm test` / `npm run test:coverage`. The actual load run
needs approved config, test accounts, real inventory and infra coordination;
see [performance guide](../../performance/README.md). From `deploy/staging`, run
`npm test` / `npm run test:coverage`; real staging smoke/rollback needs the
[staging runbook](../../deploy/staging/README.md).

In the separate `api-gateway` checkout, run `npm ci`, `npm test`, `npm run lint`,
`npm run format:check` and `npm run typecheck`. Its test register/developer guide
are maintained in that repository. This issue changes no gateway runtime code.

## Demo sequence and expected results

| Step | Show                               | Expected / failure check                                                                                                                                                                            | Evidence to save                                                                     |
| ---- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1    | Home, Services, Contact and Offers | Hotel background stays on Home. Substitute asset labels visible. Contact text survives map failure. Unsupported subscriptions/facility booking are not successful actions.                          | Public-page screenshots; owner content review.                                       |
| 2    | Rooms and comparison               | API rooms show real prices/amenities, up to three comparisons; failed images have readable fallbacks. No sample production cards.                                                                   | Rooms/compare screenshot at desktop and 320px.                                       |
| 3    | Search/calendar                    | Valid future dates show real counts; blocked ranges/over-capacity search cannot be selected as available; edits invalidate old results. No reservation from browsing.                               | Calendar and error/retry screenshot; availability request result.                    |
| 4    | Sign Up, Sign In and sign-out      | Create a test guest, then sign in. Return path retains stay choices. Invalid credentials fail. Sign-out protects Profile again. Social/recovery controls remain unavailable.                        | Redacted auth/error screens; never capture passwords or cookies.                     |
| 5    | Booking screens 1–3                | Selection→details→guest/payment with five milestones. Quote refresh uses backend prices; unsupported extras/promo codes are not applied.                                                            | Quote/sidebar and review screenshot, with tokens removed.                            |
| 6    | PayHere sandbox                    | With sandbox credentials/callback configured, complete hosted payment. Verify callback plus Retrieval before claiming confirmation. Cancel/failed provider/redirect-only success stays unconfirmed. | Redacted booking reference/status; sandbox provider verification log/event IDs only. |
| 7    | Final screen/email/Profile         | Same owned booking/dates/totals appear across views. Sandbox email means no delivery; acceptance means provider receipt only. Print works; PDF unavailable.                                         | Final/Profile/print screenshots and redacted mail state.                             |
| 8    | Modify/cancel                      | Eligible >24h booking uses preview and explicit confirm. Duplicate attempts do not repeat work. Updates appear in Profile/final screen; refund shows pending staff work.                            | Before/after status and updated email state; no claim of executed refund.            |
| 9    | Security/negative cases            | Another guest cannot read/change the booking; invalid token rejected; forged return parameter cannot confirm an unpaid booking; enquiry abuse is limited.                                           | Automated security report plus redacted manual response.                             |
| 10   | Operational evidence               | Reviewed staging image pair passes health/routes. Deliberately failed smoke restores previous digests. Load records hardware, targets and last-room behavior.                                       | Actual staging/rollback/load artifacts when available; otherwise mark pending.       |

For an offline demonstration use the fixture browser suites and label their
screenshots **fixture evidence**. Do not improvise a live payment, email delivery,
invented inventory result, system-capacity claim or successful staging release.

## Evidence record to complete for the actual release

| Item                                      | Current state / value to record                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Reviewed release SHA / PR / peer          | Pending; enter actual links and reviewer.                                                         |
| Fresh-machine teammate walk-through       | Pending; record OS, Node/npm, DB/gateway versions and results from setup.                         |
| CI URLs / tests / date                    | Pending for the release commit; attach actual build/test reports.                                 |
| Browser screenshots/manual accessibility  | Use generated quality artifacts; manual final-frame/content review pending.                       |
| Staging URL / immutable images            | Not supplied; record actual HTTPS URL and digest pair when deployed.                              |
| Live failed-smoke rollback rehearsal      | Pending infra environment; mocked local tests are separate evidence.                              |
| NFR-14 targets / 300-user system-wide run | Pending approved targets, hardware and coordinated dataset/run.                                   |
| Sandbox PayHere/Brevo                     | Code/fixture tests exist; record actual sandbox checks separately. No live keys/artifacts.        |
| Hotel content/assets/legal/policy         | Final owner confirmation pending; use named gates in traceability.                                |
| Open functional gaps                      | HW-10 redemption, HW-11 deposits and deferred screen controls remain documented, not checked off. |

Do not commit populated credentials, real `.env`, private local performance or
staging configs, JWTs/card data or raw provider payloads. Share sanitized evidence
through the team's release/PR artifact process. Actual artifacts may contain
guest/booking details even when the fixture tools omit credentials.

## Documentation verification in this change

Local link/matrix/script and formatting checks are run for this documentation
change. Installed lockfiles and implemented command definitions are referenced
directly. A fresh-machine installation, Docker bootstrap/seed, sandbox provider
run, staging deployment and peer sign-off have not been performed here; the
table above deliberately retains them as pending. No shared schema or real
environment file is changed by documentation checks.

On 2026-10-25 the checker passed for 135 local links, all 17 requirement rows,
all 12 screen rows and referenced package scripts; curated Markdown/JavaScript
formatting checks passed. The Release documentation checks workflow repeats the
structural check on PRs to the integration branches. These are documentation
results, not a newly executed full application/regression run.
