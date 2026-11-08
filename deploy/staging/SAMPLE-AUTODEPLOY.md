# Automatic deployment for the existing Azure sample

**Progress updated: 8 November 2026 (Asia/Colombo).** Results below are based on
the terminal output, screenshots and confirmations supplied during deployment.
No passwords, tokens or private keys belong in this document.

## Current deployment status

**The first automatic staging deployment succeeded according to the user's
confirmation.** After deployment, the user reported the latest website, public
health, login, rooms, booking and sandbox-payment checks working. Exact successful
run/commit identifiers, image inventory and detailed test evidence still need
recording; a live rollback rehearsal and whole-system acceptance remain pending.

| Item                       | Recorded configuration/result                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Hosting                    | Azure for Students; VM hotel-website-staging; Malaysia West                                                            |
| Resource group / VNet      | forever-hotel-staging-rg / vnet-malaysiawest-1                                                                         |
| Public IP                  | 172.197.160.147; confirm in Azure after resource changes                                                               |
| Public hostname            | forever-hotel-staging.malaysiawest.cloudapp.azure.com                                                                  |
| Capacity                   | 2 CPUs, about 4 GiB RAM and 61 GiB root filesystem                                                                     |
| Database                   | Neon; exact branch and migration version not yet recorded                                                              |
| Runtime                    | Docker Compose v5.7.0; four containers running in supplied output                                                      |
| Backend, frontend, gateway | Healthy in supplied Compose status                                                                                     |
| HTTPS                      | Caddy running; local TLS returned HTTP 200; public TCP 443 and website access confirmed                                |
| Automatic release          | User confirmed deployment succeeded after GHCR login was configured; successful run ID/full commit SHA still to record |

The current VM is a budget website sample, below the SDS whole-system baseline
of 4 CPUs, 8 GiB RAM and 50 GB SSD. It does not establish capacity for all services.

## What we did to host the website

1. Created the Azure VM in Malaysia West after the student subscription blocked
   Southeast Asia. Connected with SSH and corrected Windows private-key file
   permissions when OpenSSH rejected the original file permissions.
2. Installed Docker Engine and Compose, verified hello-world, and resized the
   original approximately 1-GiB VM to approximately 4 GiB RAM.
3. Created `/opt/hotel-website-staging` and `forever-hotel-internal` Docker network.
4. Added the Azure DNS label above and verified it resolves to the public IP.
5. Cloned hotel-website and api-gateway. Initial remote checkout versions supplied
   were HW develop/3551505 and gateway main/d08d9a7. These are historical sample
   source references; later GitHub merges do not prove the running images changed.
6. Prepared private server files backend.env, frontend.env and gateway.env. Added
   gateway-routes.json enabling only HW and Caddyfile for the shared hostname.
7. Added the backend `/health/ready` alias for gateway compatibility, retaining
   `/health` and database-outage behavior. Preserved the change with tests in Git;
   user reported successful CI and merge through pre-develop into develop.
8. Created and validated compose.sample.yml. Built backend, gateway and frontend
   images sequentially on the server with local :sample tags, then started them.
9. Resolved Caddy's Docker IP collision: gateway already owned .2. Set Caddy to
   172.30.80.254, proxy trust to 172.30.80.254/32, and dynamic edge allocation to
   172.30.80.0/25. Recreated the sample network without removing persistent volumes.
10. Preserved Caddy certificate volumes. Opened public TCP 80 and the initially
    missing TCP 443 rule in Azure; verified laptop HTTPS connectivity and public
    homepage/backend health. Application ports remain unpublished.
11. Verified container restart after a temporary VM stop/start. Saved files and
    images stayed on the persistent disk; no rebuild was required for that restart.

Current request path:

```text
Visitor --HTTPS--> Caddy --website paths--> Next.js frontend
                    |                         |
                    +-- /hw --> API gateway <-+ (internal API calls)
                                  |
                             NestJS backend --TLS--> Neon
```

Only Caddy publishes 80/443. The backend (3000), frontend (3001) and gateway (8080)
communicate on Docker networks. Caddy retains /hw when forwarding; the gateway
strips it before calling the backend. No Azure-hosted PostgreSQL VM was created.

## Automatic deployment progress and resolved problems

Completed or reported configured:

- Dedicated GitHub Actions SSH public key added alongside the administrator key
  in authorized_keys; dedicated private key stored in STAGING_SSH_KEY.
- Server hostname plus verified public host key stored in STAGING_SSH_KNOWN_HOSTS.
- Four staging environment variables saved; develop branch restriction instructed
  and reported configured. Secret contents are intentionally not recorded.
- Host Node v22.23.4, npm 10.9.9, curl 8.5.0 and noninteractive sudo Docker access
  verified. sample.smoke.local.json created and JSON validation passed.
- sample-core.mjs and sample-release.mjs plus sample.test.mjs added. All 22 local
  deployment tests passed with fake adapters; live rollback remains unverified.
- Browser keyboard focus timing fix passed its local regression tests and full
  quality journey (48 viewport/accessibility audits). No booking logic bypassed.
- Docker-owned actions replaced with CLI commands after organization policy
  blocked them. Invalid job-level runner.temp use replaced by a runner step using
  RUNNER_TEMP/GITHUB_ENV. Both fixes preserve image publication/digest intent.
- Backend dependency scan initially found high-severity issues. Updated locked
  dependencies to body-parser 2.4.0 and a scoped Multer 2.5.0 override; upgraded
  frontend Next.js and matching ESLint configuration to 16.4.5 after a critical
  finding. Live audits then showed zero high/critical findings, with 29 backend
  low/moderate and 8 frontend moderate findings remaining at that check. Backend
  build/lint and 445 tests with coverage, frontend build/lint and 55 tests, and
  the full fixture browser quality journey passed locally. This is time-specific
  evidence; future releases must rerun audits against current advisories.
- After approval was resolved, SSH failed to load the deployment private key
  with `error in libcrypto`; replacement of the correctly formatted private-key
  secret was instructed. A later run reached the host adapter, establishing that
  it had passed SSH authentication and copied/executed the release tools.
- The host recorded `prepared`, while the old application containers remained
  healthy. Candidate Compose validation passed, and a direct candidate image pull
  returned `unauthorized`, identifying missing server GHCR read access.
- User created/configured registry access and confirmed `sudo docker login ghcr.io`
  succeeded. Token input was corrected so the token was entered at a hidden prompt,
  not inside the prompt text. Credentials must remain private; verify revocation
  of any token previously entered visibly in a command. No token is recorded here.
- User then confirmed the automatic deployment completed and all requested website
  checks worked. GitHub run URL, deployed full SHA and final running image IDs were
  not supplied, so they are not inferred from an earlier failed candidate.

**Historical approval failure, subsequently passed:** Automatic sample staging for PR #95, pre-develop into
develop, displayed merge SHA 9848756. Backend, frontend and container checks passed.
release-checks failed with **Final PR head needs peer approval**. The images and
deploy jobs were skipped. That historical attempt did not update Azure; it is not
the latest deployment status.

The current guard requires a non-author approval on the release PR's final head
and no unresolved changes-requested review. Approval on an earlier feature PR
does not satisfy the separate pre-develop-to-develop PR. Obtain actual review
before merging future release PRs. If GitHub permits approval of the already
merged PR, a retry still requires that commit to be the current develop head;
otherwise use the next valid reviewed release. Do not remove the gate simply to
make a run pass.

### Next steps for this service

1. Record the successful Actions run URL/number, full source commit and image
   digests; compare the release record with the actual running frontend/backend.
2. Save the user's successful public/functional checks as repeatable evidence:
   latest UI, health, rooms, login, booking, sandbox payment and controlled email.
   User confirmation is recorded separately from automated smoke/fixture tests.
3. Rehearse failed-candidate recovery in staging and verify the previous image
   pair serves correctly. Retain old images and certificate volumes. Do not run a
   destructive failure experiment on a future production environment.
4. Track remaining low/moderate findings and run current audits and the required
   security/load checks. Verify database restore separately from image rollback.
5. Review shared infrastructure ownership with the infra team before extending
   this sample implementation to the other subsystems. The successful sample
   does not close that architectural/organizational decision.

### Capture the successful release without exposing credentials

On the Ubuntu server:

```sh
cd /opt/hotel-website-staging
cat .sample-release/last-attempt.json
cat .sample-release/active.json
sudo docker compose -f compose.sample.yml -f .sample-release/active.json ps
sudo docker inspect --format '{{.Name}} {{.Image}}' \
  hotel-website-sample-frontend-1 hotel-website-sample-backend-1
```

These files contain deployment status/image references, not environment secrets.
Record their timestamp/status and the matching Actions run before claiming exact
release provenance. The previous candidate references from the `prepared` failure
are not evidence of the final successful release's digests. Never paste backend.env,
gateway.env, Docker's registry config.json or SSH private keys into a report.

This workflow targets the already running **hotel-website-sample** project at
`/opt/hotel-website-staging`. It updates only frontend/backend images. It never
runs `down`, changes migrations, uploads environment files, restarts the gateway
or Caddy, or deletes certificate volumes. Releases are in place and may briefly
interrupt requests. This is staging, not the production release workflow.

## What triggers it

`.github/workflows/staging-sample.yml` runs on pushes to `develop`. It calls the
existing backend, frontend and container CI workflows, then builds/publishes images
only after those checks, release regression tests, dependency scans and final-head
peer approval checks pass. The previous independent push triggers exclude develop
because its same CI jobs now run under this workflow; PR/pre-develop checks remain.
Manual retries must select develop and pass the same checks. Protect develop from
direct pushes and require reviewed PRs. A newer develop head makes a queued older
release fail rather than deploy stale code. Publishing and SSH failures fail the run.

The triggering commit supplies both the checked source and release tools. Merge
this implementation through review into pre-develop, then a reviewed PR into develop.
Do not push feature code directly to develop or assume this is enabled before merge.

## One-time host prerequisites

Run in the Ubuntu SSH session:

```sh
node --version
sudo -n docker version
curl --version
cd /opt/hotel-website-staging
sudo docker compose -f compose.sample.yml config --quiet
sudo docker compose -f compose.sample.yml ps
```

The host requires **Node 22.14 or newer**, curl, and a working Compose with --wait.
Installing Docker did not establish that Node exists; install a supported Node 22
runtime before enabling this workflow if the version check fails. Keep the existing
four containers healthy and retain the known-working local image IDs. No pruning
until releases and rollback have been accepted. The deployment SSH account needs
noninteractive `sudo -n docker` permission; Docker control is privileged.

Create the non-secret smoke config on the server (do not replace an existing file
without checking it):

```sh
umask 077
nano /opt/hotel-website-staging/sample.smoke.local.json
```

```json
{
  "websiteUrl": "https://forever-hotel-staging.malaysiawest.cloudapp.azure.com"
}
```

The smoke checks require a real HTML homepage and `/hw/health` reporting database
up and hotel-website identity. They use verified HTTPS with local name resolution
because Azure public-IP hairpin access failed in this setup. CI separately checks
public health from GitHub after release. This basic smoke is not full booking,
payment, email or logged-in regression coverage: keep the existing richer smoke
contracts and add their required fixtures before claiming that coverage.

## GitHub environment and registry

The staging environment requires:

| Type     | Name                                                          |
| -------- | ------------------------------------------------------------- |
| Variable | STAGING_HOST (hostname only, not https://)                    |
| Variable | STAGING_USER                                                  |
| Variable | STAGING_PORT                                                  |
| Variable | STAGING_DIRECTORY                                             |
| Secret   | STAGING_SSH_KEY (dedicated private deployment key)            |
| Secret   | STAGING_SSH_KNOWN_HOSTS (verified hostname + public host key) |

Restrict the environment to develop. Keep PR review before merge; do not require a
manual staging-environment approval if fully automatic staging is intended.
`STAGING_ROOM_IMAGE_HOSTS`, when needed, is a **repository variable** because the
build job does not access the environment; match the frontend runtime allowlist.

Allow Actions to publish packages under the organization policy.

The sample workflow uses GitHub-owned actions and the hosted runner's Docker CLI
for Buildx setup, registry login and image publication. It does not require allowing
external `docker/*` actions. Registry authentication uses the job token through
standard input, and image digests are read from Buildx metadata and validated.

Images use:

```text
ghcr.io/forever-hotel/hotel-website/frontend@sha256:...
ghcr.io/forever-hotel/hotel-website/backend@sha256:...
```

Public repositories do not automatically produce public packages. Before first SSH
deployment, deliberately choose either public package visibility (where approved)
or configure the host's Docker client with a narrowly scoped read:packages registry
credential using `sudo docker login ghcr.io --password-stdin`. The workflow's own
publishing token is not a persistent server credential. Do not place a registry
token in Compose, shell history, source code or this document.

The SSH key test from the laptop does not prove GitHub runners can reach port 22.
Confirm approved runner network access in Azure. Do not open application ports or
disable host-key checking to work around it. No automatic firewall changes are made
by this implementation. A stopped/deallocated VM must be started for deployment.

## First adoption and recovery

The host adapter snapshots the **actual running frontend/backend image IDs**, not
the old mutable :sample tags. It verifies the old release before changes and stores
the snapshot under `.sample-release/last-attempt.json`. A registry pull failure
changes no running containers. Candidate startup/health/local HTTPS smoke failure
attempts to restore both captured images and rechecks smoke; the run stays failed.
Rollback failure is recorded as failed_rollback_unverified and needs operator help.

An exclusive host lock prevents simultaneous adapter runs. A killed process can
leave a lock: inspect the actual running process and containers before removing it.
Do not remove an active lock or run the legacy Staging release workflow on this host.
The two workflows share GitHub concurrency but have different deployment contracts.

`.sample-release/active.json` is a Compose image override. After adoption, operator
restarts must include it, otherwise the base file's old :sample tags could be used:

```sh
sudo docker compose --project-name hotel-website-sample \
  --project-directory /opt/hotel-website-staging \
  -f /opt/hotel-website-staging/compose.sample.yml \
  -f /opt/hotel-website-staging/.sample-release/active.json \
  up -d --no-build --pull never --no-deps --wait backend frontend
```

Do not restart the four-container sample using only the old base file after image
adoption. The gateway and Caddy continue to use their existing configurations.

For emergency operator image recovery, use the stored `baseline` object to create
a separate JSON override with the structure below, preserving its exact image IDs:

```json
{
  "services": {
    "frontend": { "image": "sha256:THE_RECORDED_FRONTEND_ID" },
    "backend": { "image": "sha256:THE_RECORDED_BACKEND_ID" }
  }
}
```

Use that file instead of active.json in the command above, verify health/HTTPS, then
record the restored active override. Do not use placeholders as real image IDs.
No database migrations, environment changes or secret changes are reversed by image
rollback. Backward-compatible schemas/configuration remain necessary.

## Validation limits and activation checklist

- [x] User reports source/health fix merged through pre-develop into develop; the subsequent automatic release reportedly succeeded.
- [x] Node/runtime, curl and noninteractive Docker permissions verified on host.
- [x] Smoke configuration created; existing public website healthy in supplied checks.
- [x] Registry login succeeded; subsequent successful release reported, establishing image access for that attempt.
- [x] Workflow reached the host adapter and subsequent deployment reportedly succeeded using the configured SSH identity/known hosts.
- [x] Local high-severity audits passed after fixes; user reports successful automatic deployment through configured gates. Retain the successful run link as evidence.
- [x] First automatic staging release and post-release functional checks reported successful by the user.
- [ ] Successful run ID, full commit SHA and image digests recorded and compared with running containers.
- [ ] Failed-candidate recovery rehearsed in staging with evidence.
- [ ] Authenticated booking/payment/email regression fixtures added as required.

Local tests exercise release decisions and command construction with fake adapters;
they do not operate Docker/SSH, publish images or prove a live rollback. External
post-release health failure marks the workflow failed for investigation; that
network-facing check does not automatically undo an otherwise locally healthy
release. Internal candidate failures do invoke rollback. Capture both checks and
investigate a difference instead of claiming all failure modes are covered.

## When deploying the whole project

The organization has six subsystem repositories (HW, MAD, FDS, FOSS, KMS, WKMS),
plus api-gateway, infra, tests and documents. Only the website sample and its shared
gateway/edge are confirmed running here; no extra application VMs were created.

1. Inspect the remaining five application repositories, infra and tests. Record
   owners, Dockerfiles, real ports, readiness endpoints, environment templates,
   database ownership and actual REST/event/realtime contracts.
2. Resolve documented architecture differences through reviewed ADRs and update
   SRS/SDS where needed: authentication ownership, Neon/shared database domains,
   payment provider, real-time platform and gateway WebSocket support.
3. Agree repository ownership before generalizing these scripts. Unit guideline
   Section 3.1 places shared IaC/Compose/CI-CD/deployment scripts in infra. ADR-001
   permits subsystem CI and retains shared infrastructure in infra, but remains
   Proposed in the reviewed documentation. Keep app tests/build/publication near
   app code; consolidate shared Azure/network/Compose/Caddy/messaging/migration
   and release/rollback definitions in infra under reviewed ownership. No files
   have been moved yet. Pin the infra tooling version used by release workflows.
4. Measure memory, CPU, latency and credit consumption before choosing extra VMs.
   One Azure VNet can hold multiple VMs; a 2–3 VM split was discussed, not deployed.
   Neon stays managed externally over TLS and needs no extra Azure database VM.
5. For cross-VM deployments, use private VM addresses and scoped network rules.
   Docker service names and forever-hotel-internal are local to their Docker host
   and do not automatically connect different servers.
6. Plan public frontend hostnames or explicitly supported base paths. The hotel
   website/guest portal are public; staff applications follow the agreed staff
   access policy. Do not place another Next.js frontend under an arbitrary path
   without testing assets, redirects and cookie scope.
7. Apply canonical infra migrations once per environment; keep staging/production
   data and credentials separate. Confirm authoritative domain writers.
8. Deploy required RabbitMQ, realtime and KOT printing components with durable
   messaging, retries/dead letters and duplicate-safe processing. Verify gateway
   upgrades and secure printer connectivity from actual implementations.
9. Deploy each service with reviewed immutable images, private settings, routes,
   readiness checks and independent release evidence. Use real integration
   dependencies to determine the order rather than guessing missing endpoints.
10. Run full journeys: booking -> reception check-in -> room guest access -> food
    order -> kitchen/KOT -> worker delivery -> guest status -> checkout/folio and
    session revocation -> cleaning -> manager reporting.
11. Verify service failure isolation, restart recovery, role/guest boundaries,
    backups/restores and rollback; measure the SRS concurrency and timing targets.
    Prepare deployed staging evidence and the unit's demonstration submission.

The user-confirmed automatic website release is progress toward the unit's
Section 7.2 staging requirement. Preserve its run evidence and verify recovery.
A single website release is not acceptance of all six subsystems, a production
release, or proof of the whole-system availability/load requirements.
