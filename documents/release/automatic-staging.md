# Hotel Website automatic staging

## Routine release

Review and merge the service PR into develop. The publication workflow runs existing checks, confirms final-head peer approval, builds/publishes immutable backend/frontend images and calls the shared infra staging action with the artifact from that same run. There is no second infra PR or manual deployment approval for routine application changes.

## Existing VM project

The hw profile updates only backend and frontend in hotel-website-sample under /opt/hotel-website-staging. It preserves Caddy, gateway, networking, private env files and database. It uses /opt/forever-hotel/.infra-release/host.json and both existing full/sample locks, then checks source freshness, adopted configuration, readiness and public HTTPS. A failed rollout attempts previous-image recovery and remains failed; recovery is not a database restore.

## GitHub settings

Repository variables: SERVICE_STAGING_ENABLED=true, STAGING_HOST=forever-hotel-staging.malaysiawest.cloudapp.azure.com, STAGING_USER=azureuser. The staging environment permits develop, with no additional reviewer gate. This job reuses the existing STAGING_SSH_KEY and STAGING_SSH_KNOWN_HOSTS secrets; no new private key is committed or exported.

## Watching a release

Actions -> Publish and deploy reviewed HW images -> latest develop run -> Deploy Hotel Website to staging. A PR run checks code but skips publication/deployment. A successful deployment retains hw-staging-receipt; private host state is /opt/forever-hotel/.infra-release/hw-last-attempt.json. Test the actual changed flow after deployment; readiness alone does not prove email delivery or payment settlement.

## Review dependency and compatibility

Review and merge the infra PR containing shared action commit 71948dcbdd3101641bb315a409edee652dcfb151 before approving this service PR. The first live automated release occurs after the service PR merges and checks pass. Future action changes need a reviewed immutable pin update. Compatible database migrations and env/route changes are separate coordinated work. Before a full infra promotion, align its HW images with the successful HW receipt to prevent a version rollback.

The old local application branch and its uncommitted contact/env changes are not included in this deployment-only PR. The removed legacy standalone workflows are not restored. Production is unchanged.
