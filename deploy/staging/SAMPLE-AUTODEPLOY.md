# Automatic deployment for the existing Azure sample

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

Allow Actions to publish packages under the organization policy. Images use:

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

- [ ] Reviewed source/health fix is on pre-develop, then develop.
- [ ] Node/runtime, curl and noninteractive Docker permissions verified on host.
- [ ] Smoke configuration created; existing public website healthy.
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
