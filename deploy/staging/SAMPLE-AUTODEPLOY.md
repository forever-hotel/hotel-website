# Automatic deployment for the existing Azure sample

**Progress updated: 7 November 2026 (Asia/Colombo).** Results below are based on
the terminal output, screenshots and confirmations supplied during deployment.
No passwords, tokens or private keys belong in this document.

## Current deployment status

**Manual hosting works. Automatic release has not completed successfully yet.**
The public homepage and `/hw/health` returned successfully, and the user reported
the website features working. Detailed functional, load and live rollback evidence
still needs capturing.

| Item                       | Recorded configuration/result                                                           |
| -------------------------- | --------------------------------------------------------------------------------------- |
| Hosting                    | Azure for Students; VM hotel-website-staging; Malaysia West                             |
| Resource group / VNet      | forever-hotel-staging-rg / vnet-malaysiawest-1                                          |
| Public IP                  | 172.197.160.147; confirm in Azure after resource changes                                |
| Public hostname            | forever-hotel-staging.malaysiawest.cloudapp.azure.com                                   |
| Capacity                   | 2 CPUs, about 4 GiB RAM and 61 GiB root filesystem                                      |
| Database                   | Neon; exact branch and migration version not yet recorded                               |
| Runtime                    | Docker Compose v5.7.0; four containers running in supplied output                       |
| Backend, frontend, gateway | Healthy in supplied Compose status                                                      |
| HTTPS                      | Caddy running; local TLS returned HTTP 200; public TCP 443 and website access confirmed |
| Automatic release          | Triggered on develop; latest supplied attempt failed the final PR-head approval check   |

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

## Automatic deployment progress and current blocker

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

**Latest supplied run:** Automatic sample staging for PR #95, pre-develop into
develop, displayed merge SHA 9848756. Backend, frontend and container checks passed.
release-checks failed with **Final PR head needs peer approval**. The images and
deploy jobs were skipped. This attempt did not update Azure.

The current guard requires a non-author approval on the release PR's final head
and no unresolved changes-requested review. Approval on an earlier feature PR
does not satisfy the separate pre-develop-to-develop PR. Obtain actual review
before merging future release PRs. If GitHub permits approval of the already
merged PR, a retry still requires that commit to be the current develop head;
otherwise use the next valid reviewed release. Do not remove the gate simply to
make a run pass.

### Next steps for this service

1. Resolve genuine peer approval for the final release changes.
2. Confirm remaining CI and dependency-scan gates pass; the latest run stopped
   before proving all release checks completed.
3. Establish GHCR package publication permissions and server pull access. Public
   repository visibility alone does not prove image pull access.
4. Verify GitHub runner SSH connectivity and pinned host identity. Laptop access
   is not evidence of runner access through Azure network rules.
5. Complete the first automatic images/deploy run; check public homepage and
   /hw/health, then record full source SHAs and running image digests.
6. Rehearse failed-candidate recovery on staging and save evidence. Check logged-in
   booking, sandbox payments, email and relevant security/load scenarios.
7. Agree shared infrastructure ownership with the infra team before extending
   this sample implementation to the other subsystems.

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

- [x] User reports source/health fix merged through pre-develop into develop; latest supplied release PR's approval check is separately blocked.
- [x] Node/runtime, curl and noninteractive Docker permissions verified on host.
- [x] Smoke configuration created; existing public website healthy in supplied checks.
- [ ] Server can pull selected GHCR packages.
- [ ] GitHub runner SSH reachability and pinned host identity verified.
- [ ] All CI, dependency scans and final-head peer review pass.
- [ ] First release succeeds and recorded digests match running images.
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

The unit's Section 7.2 automatic staging requirement is the target; a triggered
workflow that stops at approval is not proof that deployment succeeded. A single
VM and a successful homepage are not full-system availability/load evidence.
