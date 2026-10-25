# Controlled staging releases (DDP-#35)

The manual **Staging release** workflow builds frontend/backend images in GHCR,
deploys immutable digests to an infra-managed Docker Compose host, waits for
container health and verifies the external HTTPS guest routes. A failed release
restores the last working image pair and still fails the workflow. Production
deployment remains outside this workflow and subject to infra's approval gate.

**Actual staging deployment and a live rollback rehearsal are pending.** No host,
registry access or staging credentials were supplied. Docker Compose follows
the repository's existing container approach; infra must confirm it matches the
staging platform before enabling this workflow. Local tests use synthetic
responses and deployment adapters, not a real remote server.

## Local tests

Requires Node 22.14 or newer; no package installation:

```powershell
cd D:\hotel-project\hotel-website\deploy\staging
npm test
npm run test:coverage
```

These exercise image digest validation, successful promotion, smoke failure,
automatic rollback, failed rollback, first-deploy failure, unchanged-image
retries and public/protected/payment smoke contracts. They never publish an
image, change a database or contact staging. CI runs them on tooling changes.

Verification on 2026-10-25: 16 tests pass; release-core and smoke modules have
100% line coverage, with branch coverage above 80%. Workflow YAML parses and
Docker Compose configuration validation passes. The host-side Docker/SSH
adapter and a live rollback have not been executed; those require infra setup.

## Infra setup (one time)

Use a dedicated staging host/directory and account with Docker access. Install
Node 22.14+, Docker Engine and Compose v2 with `up --wait` support. Docker access
is privileged: protect the SSH account and environment credentials accordingly.
The release process uses a filesystem lock as well as GitHub workflow concurrency.

1. Create an absolute directory such as `/opt/hotel-website-staging`, owned by
   the deployment account. The workflow transfers reviewed tooling there.
2. Provision the shared gateway network, TLS proxy and database through infra.
   The staging Compose stack publishes no ports and manages only the two website
   services. Route the website proxy to `hotel-website-frontend:3001`; set the
   gateway's `HW_SERVICE_URL=http://hotel-website-backend:3000` with `/hw` rewritten
   to `/`. Confirm gateway routes include health, catalogue, guest, booking and
   payment status. Do not change the gateway routing contract for this release.
3. Create `staging.compose.local.env` in the host directory using
   `compose.env.example`. Set the existing external network and absolute paths
   to backend/frontend environment files. Copy the corresponding examples,
   replace placeholders with actual staging values, and chmod secret files 600.
   Use `API_GATEWAY_URL` reachable from the frontend container, never a build-time
   browser secret. Configure approved pricing/management policies and PayHere
   sandbox if those features are enabled. Database synchronization and SQL
   logging are forced off by Compose; no migrations run during a release.
4. Allow required outbound provider/TLS access through infra. Configure registry
   access on the host with a read-only GHCR credential and `docker login ghcr.io`
   using `--password-stdin`. Keep that token on the host; it is not the workflow's
   ephemeral publishing token. Retain prior digest images for rollback.
5. Create `staging.smoke.local.json` at the host root from `smoke.example.json`.
   Supply external HTTPS origins, actual photo paths, a real catalogue room UUID
   and an owned **unpaid** test booking UUID. Point `credentialsFile` at a private
   JSON file containing `{ "email": "...", "password": "..." }` for a dedicated
   smoke guest. The booking may be pending/expired or cancelled, with zero paid
   amount. Refresh this fixture deliberately if it is deleted. The smoke runner
   does not create accounts/bookings or charge cards. Status reads can trigger
   normal reconciliation, so use an unpaid fixture without a real provider order.
6. Create a GitHub `staging` environment with required reviewers and deployment
   branch restricted to `develop`. Add secrets `STAGING_SSH_KEY` and
   `STAGING_SSH_KNOWN_HOSTS` (the pinned host public-key entry, verified through
   infra; never disable host-key checking). Add environment variables
   `STAGING_HOST`, `STAGING_USER`, `STAGING_PORT` (default 22), and
   `STAGING_DIRECTORY` (the absolute directory above). Hostnames and paths use
   simple letters/digits/slashes/hyphens; no spaces or shell expressions.
7. Give the repository Actions token package publishing permissions and confirm
   package visibility/access matches the host's read-only registry account.
   Protect `develop` and the staging workflow from unreviewed changes.

If room photos use approved external HTTPS hosts, set the repository variable
`STAGING_ROOM_IMAGE_HOSTS` to their comma-separated exact hostnames before
building. Next serializes image optimizer configuration at build time; the
workflow passes this public allowlist as a Docker build argument. Use the same
`ROOM_IMAGE_HOSTS` value in the host frontend environment. Changing only the
runtime value cannot add optimizer hosts to an existing image.

Root staging `*.local.*` config, smoke credentials and `.staging-state/` are
ignored by Git. Never upload environment files, registry credentials or JWTs as
deployment artifacts.

## Release

Merge the tooling first. Select **Actions → Staging release → Run workflow** on
`develop` and enter the full 40-character merge SHA of a reviewed PR to `develop`.
The workflow requires peer approval on the final PR head and successful Backend
CI, Frontend CI and Container checks for that exact commit. It rejects arbitrary
branch heads, unmerged commits and missing/failed CI. Squash/rebase strategies
must expose that SHA as the associated PR merge commit through GitHub's API;
otherwise use the repository's reviewed merge strategy rather than bypassing it.

The workflow publishes images tagged with the source SHA and deploys their
`sha256` digests after the staging environment gate. Frontend environment values
are supplied at runtime; backend deployment includes no public schema changes.
This is an in-place rollout and may have brief downtime. It does not claim
blue/green or zero-downtime behavior.

Smoke requires:

- Gateway `/hw/health` reports database readiness and the website service identity.
- Home, rooms, offers and sign-in return real HTML; catalogue contains the configured
  room; original and optimized images return actual image responses.
- An unknown page returns HTTP 404; unauthenticated Profile, booking detail and
  payment confirmation redirect to same-origin sign-in.
- Invalid JWTs are rejected, a real test login can read its owned booking list,
  and the authenticated Profile renders.
- The owned unpaid booking status remains unpaid, and a forged `status=success`
  return parameter cannot make the confirmation page claim a confirmed stay.

The workflow uploads requested digests, candidate smoke, rollback smoke (when
applicable) and the attempt outcome. Compare image digests and timestamps: reports
can be from an earlier attempt if SSH/startup failed before the host wrote new
state. A green workflow is required; a restored prior version does not turn the
failed release green.

## Rollback and recovery

`.staging-state/release.json` records `current` and `previous` digests only after
successful health and smoke. Re-running the same digests preserves `previous`.
Failed candidate smoke attempts restore `current` from cached images, rerun
health/smoke, preserve the working pointer and return a nonzero exit code. The
candidate and rollback reports are retained separately. If there was no previous
release, failed candidate services are stopped without removing any database.

For an explicit rollback, on the staging host in its deployment directory:

```sh
printf '%s\n' '{"rollback":true}' | node deploy/staging/release.mjs
```

This selects `previous`, rechecks health/smoke and swaps the image pointers on
success. Keep cached images and do not run image pruning before a release is
accepted. If rollback health cannot be verified, the workflow stays failed;
infra must inspect the host and restore service. The workflow never reverses
database migrations or secret/config changes. Ensure backend releases remain
compatible with the existing schema and the previous frontend/backend pair.

Do not mix manual Compose operations with automated releases. On first adoption
of an existing stack, infra must inventory its real working digests and record a
verified `current` state before deploying; missing state is treated as a fresh
installation. After a killed process, inspect services and attempt reports before
removing a stale `.staging-state/release.lock`. Do not delete an active lock.

## Evidence still required in staging

Attach the reviewed SHA, published digests, green smoke artifact, infra gateway/TLS
configuration confirmation and a failed-smoke rollback rehearsal showing the
old digests serving successfully. Rehearse a deliberately invalid candidate in
isolated staging, never production. Local mocked rollback tests do not satisfy
the live deployment acceptance criterion by themselves.
