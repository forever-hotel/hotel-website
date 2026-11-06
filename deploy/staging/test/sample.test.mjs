import assert from "node:assert/strict";
import test from "node:test";
import { sampleRelease, composeArgs, upArgs } from "../sample-core.mjs";

const candidate = {
  frontend:
    "ghcr.io/forever-hotel/hotel-website/frontend@sha256:" + "a".repeat(64),
  backend:
    "ghcr.io/forever-hotel/hotel-website/backend@sha256:" + "b".repeat(64),
};
const baseline = {
  frontend: "sha256:" + "c".repeat(64),
  backend: "sha256:" + "d".repeat(64),
};
function fixture() {
  const deployments = [],
    records = [];
  return {
    deployments,
    records,
    snapshot: async () => baseline,
    smoke: async () => {},
    pull: async () => {},
    deploy: async (images) => deployments.push(images),
    record: async (value) => records.push(value),
  };
}

test("sample release snapshots actual local images on first adoption", async () => {
  const a = fixture();
  assert.equal((await sampleRelease(candidate, a)).status, "released");
  assert.deepEqual(a.deployments, [candidate]);
  assert.deepEqual(a.records[0].baseline, baseline);
});
test("candidate failure restores image IDs and keeps attempt failed", async () => {
  const a = fixture();
  let calls = 0;
  a.smoke = async () => {
    if (++calls === 2) throw Error("candidate");
  };
  assert.equal(
    (await sampleRelease(candidate, a)).status,
    "failed_rolled_back",
  );
  assert.deepEqual(a.deployments, [candidate, baseline]);
});
test("partial deployment failure restores both services", async () => {
  const a = fixture();
  a.deploy = async (images) => {
    a.deployments.push(images);
    if (images === candidate) throw Error("partial");
  };
  assert.equal(
    (await sampleRelease(candidate, a)).status,
    "failed_rolled_back",
  );
  assert.deepEqual(a.deployments, [candidate, baseline]);
});
test("unverified rollback is recorded distinctly", async () => {
  const a = fixture();
  let calls = 0;
  a.smoke = async () => {
    if (++calls > 1) throw Error("smoke");
  };
  assert.equal(
    (await sampleRelease(candidate, a)).status,
    "failed_rollback_unverified",
  );
});
test("bad baseline, bad input and failing preflight do not deploy", async () => {
  for (const mode of ["input", "baseline", "smoke", "pull"]) {
    const a = fixture();
    if (mode === "baseline")
      a.snapshot = async () => ({ ...baseline, frontend: "mutable:tag" });
    if (mode === "smoke")
      a.smoke = async () => {
        throw Error("preflight");
      };
    if (mode === "pull")
      a.pull = async () => {
        throw Error("registry");
      };
    await assert.rejects(
      sampleRelease(
        mode === "input" ? { ...candidate, backend: "latest" } : candidate,
        a,
      ),
    );
    assert.deepEqual(a.deployments, []);
  }
});
test("Compose targets existing sample project and only website services", () => {
  const args = composeArgs("/opt/hotel-website-staging", null, upArgs());
  assert.ok(args.includes("hotel-website-sample"));
  assert.ok(args.includes("--no-deps"));
  assert.ok(args.includes("--no-build"));
  assert.ok(args.includes("--wait"));
  assert.deepEqual(args.slice(-2), ["backend", "frontend"]);
  assert.ok(
    !args.some((arg) =>
      ["down", "--volumes", "gateway", "caddy"].includes(arg),
    ),
  );
  assert.ok(
    composeArgs("/opt/hotel-website-staging", "/opt/override.json", [
      "config",
    ]).includes("/opt/override.json"),
  );
});
