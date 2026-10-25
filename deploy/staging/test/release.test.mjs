import assert from "node:assert/strict";
import { test } from "node:test";
import { release, validateImages } from "../release-core.mjs";
const images = (digit) => ({
  frontend: `ghcr.io/hotel/website/frontend@sha256:${digit.repeat(64)}`,
  backend: `ghcr.io/hotel/website/backend@sha256:${digit.repeat(64)}`,
});
const old = images("a"),
  candidate = images("b");
function adapter({ failures = 0, current = old, rollbackFails = false } = {}) {
  const calls = [];
  let smokeCalls = 0;
  return {
    calls,
    readState: async () => ({ current }),
    deploy: async (next, pull) => {
      calls.push({ deploy: next, pull });
      if (rollbackFails && next === old) throw new Error("fixture");
    },
    smoke: async () => {
      smokeCalls++;
      if (smokeCalls <= failures) throw new Error("fixture");
    },
    writeState: async (state) => calls.push({ save: state }),
    stop: async () => calls.push({ stopped: true }),
  };
}
test("requires immutable image digests", () => {
  assert.deepEqual(validateImages(candidate), candidate);
  assert.throws(() =>
    validateImages({ ...candidate, frontend: "ghcr.io/hotel/frontend:latest" }),
  );
});
test("promotes only after health/smoke and retains prior images", async () => {
  const host = adapter();
  assert.equal((await release(candidate, host)).status, "released");
  assert.deepEqual(host.calls[1], {
    save: { current: candidate, previous: old },
  });
});
test("failed smoke restores previous digests without requiring a registry pull and marks release failed", async () => {
  const host = adapter({ failures: 1 });
  assert.equal((await release(candidate, host)).status, "failed_rolled_back");
  assert.deepEqual(host.calls[1], { deploy: old, pull: false });
  assert.equal(
    host.calls.some((call) => call.save),
    false,
  );
});
test("a failed rollback never reports success", async () => {
  assert.equal(
    (await release(candidate, adapter({ failures: 2 }))).status,
    "failed_rollback_unverified",
  );
});
test("candidate container health failure triggers rollback before promotion", async () => {
  const host = adapter();
  host.deploy = async (next, pull) => {
    host.calls.push({ deploy: next, pull });
    if (next.frontend === candidate.frontend)
      throw new Error("health wait failed");
  };
  assert.equal((await release(candidate, host)).status, "failed_rolled_back");
  assert.deepEqual(host.calls[1], { deploy: old, pull: false });
  assert.equal(
    host.calls.some((call) => call.save),
    false,
  );
});
test("first release failure stops candidate services and does not invent rollback evidence", async () => {
  const host = adapter({ failures: 1, current: null });
  assert.equal(
    (await release(candidate, host)).status,
    "failed_no_previous_release",
  );
  assert.deepEqual(host.calls[1], { stopped: true });
});
test("re-running an existing digest preserves the previous rollback target", async () => {
  const host = adapter();
  const previous = images("c");
  host.readState = async () => ({ current: old, previous });
  await release(old, host);
  assert.deepEqual(host.calls[1], { save: { current: old, previous } });
});
test("a first-release stop failure remains explicitly unverified", async () => {
  const host = adapter({ failures: 1, current: null });
  host.stop = async () => {
    throw new Error("fixture");
  };
  assert.equal(
    (await release(candidate, host)).status,
    "failed_first_release_stop_unverified",
  );
});
