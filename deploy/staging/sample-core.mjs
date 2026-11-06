import { validateImages } from "./release-core.mjs";
import { resolve } from "node:path";

export function composeArgs(root, override, args) {
  return [
    "compose",
    "--project-name",
    "hotel-website-sample",
    "--project-directory",
    root,
    "-f",
    resolve(root, "compose.sample.yml"),
    ...(override ? ["-f", override] : []),
    ...args,
  ];
}

export function upArgs() {
  return [
    "up",
    "--detach",
    "--no-deps",
    "--no-build",
    "--pull",
    "never",
    "--wait",
    "--wait-timeout",
    "180",
    "backend",
    "frontend",
  ];
}

export function validateBaseline(images) {
  for (const key of ["frontend", "backend"]) {
    if (!/^sha256:[a-f0-9]{64}$/.test(images?.[key] || "")) {
      throw new Error("Running local image IDs are required for recovery.");
    }
  }
  return { frontend: images.frontend, backend: images.backend };
}

// Snapshot the actual containers before every attempt, including the first
// adoption of the manually built sample. Never assume a mutable tag is a backup.
export async function sampleRelease(candidate, adapter) {
  validateImages(candidate);
  const baseline = validateBaseline(await adapter.snapshot());
  await adapter.smoke();
  await adapter.record({ status: "prepared", baseline, candidate });
  // Pull before changing anything. A registry failure needs no container rollback.
  await adapter.pull(candidate);
  try {
    await adapter.deploy(candidate);
    await adapter.smoke();
    await adapter.record({ status: "released", baseline, candidate });
    return { status: "released" };
  } catch {
    try {
      await adapter.deploy(baseline);
      await adapter.smoke();
    } catch {
      await adapter.record({
        status: "failed_rollback_unverified",
        baseline,
        candidate,
      });
      return { status: "failed_rollback_unverified" };
    }
    await adapter.record({ status: "failed_rolled_back", baseline, candidate });
    return { status: "failed_rolled_back" };
  }
}
