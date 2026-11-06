import {
  readFile,
  writeFile,
  rename,
  mkdir,
  open,
  unlink,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { release, validateImages } from "./release-core.mjs";
import { smoke } from "./smoke.mjs";

const root = process.cwd();
const stateDirectory = resolve(root, ".staging-state");
await mkdir(stateDirectory, { recursive: true, mode: 0o700 });
let lock;
async function atomicJson(name, value) {
  const path = resolve(stateDirectory, name);
  await writeFile(path + ".tmp", JSON.stringify(value, null, 2) + "\n", {
    mode: 0o600,
  });
  await rename(path + ".tmp", path);
}
try {
  lock = await open(resolve(stateDirectory, "release.lock"), "wx", 0o600);
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > 4096) throw new Error("Invalid release input");
  }
  const requested = JSON.parse(input);
  const config = JSON.parse(
    await readFile(resolve(root, "staging.smoke.local.json"), "utf8"),
  );
  const credentials = JSON.parse(
    await readFile(resolve(root, config.credentialsFile), "utf8"),
  );
  const readState = async () => {
    try {
      return JSON.parse(
        await readFile(resolve(stateDirectory, "release.json"), "utf8"),
      );
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  };
  const state = await readState();
  const candidate = validateImages(
    requested.rollback === true ? state?.previous : requested,
  );
  for (const name of ["candidate-smoke.json", "rollback-smoke.json"]) {
    try {
      await unlink(resolve(stateDirectory, name));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  await atomicJson("last-attempt.json", {
    status: "in_progress",
    images: candidate,
    at: new Date().toISOString(),
  });
  let smokeAttempt = 0;
  const compose = (...args) =>
    execFileSync(
      "docker",
      [
        "compose",
        "--project-name",
        "hotel-website-staging",
        "--env-file",
        resolve(root, "staging.compose.local.env"),
        "--env-file",
        resolve(stateDirectory, "images.env"),
        "-f",
        resolve(root, "deploy/staging/compose.yml"),
        ...args,
      ],
      { cwd: root, stdio: "pipe", timeout: 300000 },
    );
  const result = await release(candidate, {
    readState,
    writeState: (next) => atomicJson("release.json", next),
    deploy: async (images, pull) => {
      await writeFile(
        resolve(stateDirectory, "images.env"),
        `FRONTEND_IMAGE=${images.frontend}\nBACKEND_IMAGE=${images.backend}\n`,
        { mode: 0o600 },
      );
      compose("config", "--quiet");
      if (pull) compose("pull", "frontend", "backend");
      compose(
        "up",
        "--detach",
        "--no-build",
        "--wait",
        "--wait-timeout",
        "180",
        "frontend",
        "backend",
      );
    },
    smoke: async () => {
      const report = await smoke(config, credentials);
      await atomicJson(
        smokeAttempt++ === 0 ? "candidate-smoke.json" : "rollback-smoke.json",
        report,
      );
      await atomicJson("smoke.json", report);
      if (!report.passed) throw new Error("Failed staging smoke");
    },
    stop: async () => {
      compose("down");
    },
  });
  await atomicJson("last-attempt.json", {
    ...result,
    at: new Date().toISOString(),
  });
  console.log(JSON.stringify(result));
  process.exitCode = result.status === "released" ? 0 : 1;
} catch {
  console.error(
    "Staging release failed. Inspect host state and smoke report; secrets are not printed.",
  );
  process.exitCode = 1;
} finally {
  if (lock) {
    await lock.close();
    await unlink(resolve(stateDirectory, "release.lock"));
  }
}
