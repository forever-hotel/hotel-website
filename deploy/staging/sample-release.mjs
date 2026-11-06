import { execFileSync } from "node:child_process";
import {
  mkdir,
  open,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sampleRelease, composeArgs, upArgs } from "./sample-core.mjs";

export async function main() {
  const root = process.cwd();
  const state = resolve(root, ".sample-release");
  await mkdir(state, { recursive: true, mode: 0o700 });
  let lock;
  const run = (file, args) =>
    execFileSync(file, args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 300000,
    }).trim();
  const docker = (...args) => run("sudo", ["-n", "docker", ...args]);
  const compose = (override, ...args) =>
    docker(...composeArgs(root, override, args));
  async function atomic(path, value) {
    await writeFile(path + ".tmp", JSON.stringify(value, null, 2) + "\n", {
      mode: 0o600,
    });
    await rename(path + ".tmp", path);
  }
  const active = resolve(state, "active.json");
  async function smoke() {
    const config = JSON.parse(
      await readFile(resolve(root, "sample.smoke.local.json"), "utf8"),
    );
    const url = new URL(config.websiteUrl);
    if (
      url.protocol !== "https:" ||
      !/^[a-z0-9.-]+$/.test(url.hostname) ||
      url.port ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      throw new Error("Invalid sample HTTPS origin");
    }
    let last;
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        // Local resolution avoids Azure public-IP hairpin limitations. TLS still
        // validates the public hostname. CI also checks externally after release.
        const get = (path) =>
          run("curl", [
            "--silent",
            "--show-error",
            "--fail",
            "--max-time",
            "15",
            "--resolve",
            `${url.hostname}:443:127.0.0.1`,
            url.origin + path,
          ]);
        if (!/<html[\s>]/i.test(get("/"))) throw new Error("No homepage HTML");
        const health = JSON.parse(get("/hw/health"));
        if (
          health.status !== "ok" ||
          health.service !== "hotel-website" ||
          health.database !== "up"
        ) {
          throw new Error("Backend not ready");
        }
        return;
      } catch (error) {
        last = error;
        if (attempt < 5) await new Promise((done) => setTimeout(done, 5000));
      }
    }
    throw last;
  }
  try {
    lock = await open(resolve(state, "release.lock"), "wx", 0o600);
    let input = "";
    for await (const chunk of process.stdin) {
      input += chunk;
      if (input.length > 4096) throw new Error("Invalid release input");
    }
    const candidate = JSON.parse(input);
    const result = await sampleRelease(candidate, {
      snapshot: async () => {
        const images = {};
        for (const service of ["frontend", "backend"]) {
          const id = compose(null, "ps", "--quiet", service);
          if (!/^[a-f0-9]{12,64}$/.test(id))
            throw new Error("One running container per service required");
          images[service] = docker("inspect", "--format", "{{.Image}}", id);
        }
        return images;
      },
      smoke,
      record: (record) =>
        atomic(resolve(state, "last-attempt.json"), {
          ...record,
          at: new Date().toISOString(),
        }),
      pull: async (images) => {
        // Validate the override before pull. No docker login data is printed.
        const path = resolve(state, "candidate.json");
        await atomic(path, {
          services: Object.fromEntries(
            Object.entries(images).map(([key, image]) => [key, { image }]),
          ),
        });
        compose(path, "config", "--quiet");
        compose(path, "pull", "backend", "frontend");
      },
      deploy: async (images) => {
        await atomic(active, {
          services: Object.fromEntries(
            Object.entries(images).map(([key, image]) => [key, { image }]),
          ),
        });
        compose(active, ...upArgs());
      },
    });
    console.log(JSON.stringify(result));
    process.exitCode = result.status === "released" ? 0 : 1;
  } catch {
    console.error(
      "Sample release failed. Inspect .sample-release/last-attempt.json and container health on the host; secret-bearing command output is suppressed.",
    );
    process.exitCode = 1;
  } finally {
    if (lock) {
      await lock.close();
      await unlink(resolve(state, "release.lock"));
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  await main();
