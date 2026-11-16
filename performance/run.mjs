import { randomUUID } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { cpus, totalmem, platform } from "node:os";
import { setTimeout as sleep } from "node:timers/promises";
import { Metrics } from "./metrics.mjs";

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const operations = [
  "login",
  "page",
  "imageOriginal",
  "imageOptimized",
  "catalogue",
  "promotions",
  "availability",
  "calendar",
  "quote",
  "quoteRefresh",
  "reserve",
  "cleanup",
];
function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}
function origin(value) {
  const url = new URL(value);
  requireValue(
    ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash,
    "Use an HTTP(S) origin without credentials, path or query.",
  );
  return url.origin;
}
function localPath(path) {
  requireValue(
    typeof path === "string" &&
      path.startsWith("/") &&
      !path.startsWith("//") &&
      !/[\\\u0000-\u0020\u007f]/.test(path) &&
      new URL(path, "https://hotel.invalid").origin === "https://hotel.invalid",
    "Request paths must stay on their configured origin.",
  );
}
export function validateConfig(config, accounts) {
  origin(config.websiteUrl);
  origin(config.gatewayUrl);
  for (const [name, min, max] of [
    ["users", 2, 300],
    ["durationSeconds", 0.1, 3600],
    ["rampSeconds", 0, 600],
    ["thinkMs", 0, 60000],
    ["timeoutMs", 10, 120000],
    ["bookingEvery", 1, 1000],
  ])
    requireValue(
      Number.isFinite(config[name]) &&
        config[name] >= min &&
        config[name] <= max,
      `Invalid ${name}.`,
    );
  requireValue(
    Number.isInteger(config.users) &&
      Number.isInteger(config.bookingEvery) &&
      config.durationSeconds > config.rampSeconds,
    "Users/bookingEvery must be integers; duration must exceed ramp.",
  );
  requireValue(
    Number.isFinite(config.targets?.p95Ms) &&
      config.targets.p95Ms > 0 &&
      Number.isFinite(config.targets?.maxErrorRate) &&
      config.targets.maxErrorRate >= 0 &&
      config.targets.maxErrorRate < 1,
    "Set approved targets.p95Ms and targets.maxErrorRate (0 to less than 1).",
  );
  requireValue(
    Array.isArray(accounts) &&
      accounts.length >= config.users &&
      accounts.every(
        (item) =>
          typeof item.email === "string" &&
          item.email &&
          typeof item.password === "string" &&
          item.password,
      ) &&
      new Set(accounts.map((item) => item.email.toLowerCase().trim())).size ===
        accounts.length,
    "Supply a distinct pre-created guest account for every user.",
  );
  for (const key of [
    "environment",
    "targetReference",
    "hardware",
    "dataset",
    "systemWideTraffic",
    "revision",
  ])
    requireValue(
      typeof config.metadata?.[key] === "string" && config.metadata[key].trim(),
      `Record metadata.${key}.`,
    );
  requireValue(
    ["local-fixture", "staging"].includes(config.metadata.environment),
    "Use a staging or local-fixture environment.",
  );
  for (const key of ["gatewayTimeoutMs", "managerTimeoutMs"])
    requireValue(
      Number.isFinite(config.metadata[key]) && config.metadata[key] > 0,
      `Record metadata.${key}.`,
    );
  requireValue(
    config.publicPaths?.length > 0 &&
      config.images?.length > 0 &&
      config.stays?.length > 0,
    "Configure public pages, original/optimized images and real inventory stays.",
  );
  config.publicPaths.forEach(localPath);
  config.images.forEach((image) => {
    localPath(image.original);
    localPath(image.optimized);
    requireValue(
      image.optimized.startsWith("/_next/image?"),
      "Measure the Next optimized image endpoint.",
    );
  });
  for (const stay of [...config.stays, config.lastRoom]) {
    requireValue(
      stay &&
        uuid.test(stay.roomTypeId) &&
        /^\d{4}-\d{2}-\d{2}$/.test(stay.checkInDate) &&
        /^\d{4}-\d{2}-\d{2}$/.test(stay.checkOutDate) &&
        Date.parse(stay.checkOutDate) > Date.parse(stay.checkInDate) &&
        Number.isInteger(stay.numberOfGuests) &&
        stay.numberOfGuests > 0,
      "Configure valid room UUIDs, dates and occupancy.",
    );
  }
  requireValue(
    !config.stays.some(
      (stay) =>
        stay.roomTypeId === config.lastRoom.roomTypeId &&
        stay.checkInDate < config.lastRoom.checkOutDate &&
        stay.checkOutDate > config.lastRoom.checkInDate,
    ),
    "Last-room inventory must be isolated from the mixed load.",
  );
  return config;
}

export async function runLoad(config, accounts) {
  validateConfig(config, accounts);
  const metrics = new Metrics();
  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  const pending = new Map();
  const uncertain = [];
  let fatal = false;
  let cycles = 0;
  let lastRoom = { passed: false, reason: "not_run" };
  const gateway = origin(config.gatewayUrl);
  const website = origin(config.websiteUrl);
  async function http(name, base, path, token, input, accept, key) {
    const start = performance.now();
    let bytes = 0,
      status = 0;
    const signal = AbortSignal.timeout(config.timeoutMs);
    try {
      const response = await fetch(base + path, {
        method: input === undefined ? "GET" : "POST",
        redirect: "manual",
        signal,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(input === undefined
            ? {}
            : { "Content-Type": "application/json" }),
          ...(key ? { "Idempotency-Key": key } : {}),
          Accept: name.startsWith("image")
            ? "image/avif,image/webp,image/*"
            : "*/*",
        },
        ...(input === undefined ? {} : { body: JSON.stringify(input) }),
      });
      status = response.status;
      const chunks = [];
      for await (const chunk of response.body || []) {
        bytes += chunk.length;
        if (bytes > 25 * 1024 * 1024) throw new Error("response_too_large");
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      let body;
      if (response.headers.get("content-type")?.includes("application/json")) {
        try {
          body = JSON.parse(buffer.toString());
        } catch {
          /* Failed contract below. */
        }
      }
      const result = {
        status,
        body,
        bytes,
        contentType: response.headers.get("content-type") || "",
      };
      const ok = accept(result);
      metrics.record(name, {
        ms: performance.now() - start,
        bytes,
        status,
        error: !ok,
      });
      return { ...result, ok };
    } catch {
      metrics.record(name, {
        ms: performance.now() - start,
        bytes,
        status,
        error: true,
        timeout: signal.aborted,
      });
      return { ok: false, status, body: undefined };
    }
  }
  const collectionOk = (response) =>
    response.status === 200 && Array.isArray(response.body?.items);
  const availability = (stay, name = "availability") =>
    http(
      name,
      gateway,
      `/hw/availability?${new URLSearchParams(Object.entries(stay).map(([key, value]) => [key, String(value)]))}`,
      undefined,
      undefined,
      (result) =>
        result.status === 200 && Number.isInteger(result.body?.availableCount),
    );
  const quote = (stay, token, name = "quote") =>
    http(
      name,
      gateway,
      "/hw/booking-quotes",
      token,
      stay,
      (result) =>
        result.status === 201 && typeof result.body?.quoteToken === "string",
    );
  async function cleanup(id, token) {
    const response = await http(
      "cleanup",
      gateway,
      `/hw/payments/${id}/cancel`,
      token,
      {},
      (result) => result.status === 201 && result.body?.status === "CANCELLED",
    );
    if (response.ok) pending.delete(id);
  }
  async function reserve(preview, token, race = false) {
    const key = `load-${runId}-${randomUUID()}`;
    const response = await http(
      race ? "raceReserve" : "reserve",
      gateway,
      "/hw/bookings",
      token,
      { quoteToken: preview.quoteToken },
      (result) =>
        (result.status === 201 &&
          uuid.test(result.body?.bookingId) &&
          result.body?.status === "PENDING") ||
        (race &&
          result.status === 409 &&
          result.body?.error === "ROOM_UNAVAILABLE"),
      key,
    );
    if (response.status === 201 && uuid.test(response.body?.bookingId))
      pending.set(response.body.bookingId, token);
    else if (
      !response.ok &&
      (!response.status ||
        response.status >= 500 ||
        (response.status >= 200 && response.status < 300))
    )
      uncertain.push({
        key,
        quoteId: preview.quoteId || null,
        accountIndex: tokens.indexOf(token),
      });
    return response;
  }
  // Login setup is measured separately and bounded to avoid an accidental auth storm.
  const tokens = [];
  for (let offset = 0; offset < config.users; offset += 10) {
    const batch = await Promise.all(
      accounts
        .slice(offset, Math.min(offset + 10, config.users))
        .map((account) =>
          http(
            "login",
            gateway,
            "/hw/guests/login",
            undefined,
            account,
            (result) =>
              result.status === 200 &&
              typeof result.body?.accessToken === "string",
          ),
        ),
    );
    tokens.push(
      ...batch.map((result) => (result.ok ? result.body.accessToken : null)),
    );
  }
  const loadStarted = performance.now();
  async function race() {
    await sleep(config.rampSeconds * 1000);
    const before = await availability(config.lastRoom, "raceAvailability");
    if (!before.ok || before.body.availableCount !== 1)
      return {
        passed: false,
        reason: "requires_exactly_one_real_available_room",
      };
    const previews = await Promise.all(
      tokens
        .slice(0, 2)
        .map((token) => quote(config.lastRoom, token, "raceQuote")),
    );
    if (previews.some((result) => !result.ok))
      return { passed: false, reason: "quote_failed" };
    const attempts = await Promise.all(
      previews.map((preview, index) =>
        reserve(preview.body, tokens[index], true),
      ),
    );
    const winners = attempts.filter(
      (result) => result.ok && result.status === 201,
    );
    const losers = attempts.filter(
      (result) => result.ok && result.status === 409,
    );
    const after = await availability(config.lastRoom, "raceAvailability");
    const passed =
      winners.length === 1 &&
      losers.length === 1 &&
      after.ok &&
      after.body.availableCount === 0;
    // Verify persisted owned state, not only success response counts.
    let persisted = false;
    if (winners.length === 1) {
      const id = winners[0].body.bookingId;
      const state = await http(
        "raceStatus",
        gateway,
        `/hw/payments/${id}`,
        pending.get(id),
        undefined,
        (result) =>
          result.status === 200 &&
          result.body?.bookingId === id &&
          result.body?.status === "PENDING",
      );
      persisted = state.ok;
    }
    return {
      passed: passed && persisted,
      winners: winners.length,
      conflicts: losers.length,
      remaining: after.body?.availableCount ?? null,
      persisted,
    };
  }
  async function user(index) {
    await sleep((config.rampSeconds * 1000 * index) / config.users);
    const token = tokens[index];
    let iteration = 0;
    while (performance.now() - loadStarted < config.durationSeconds * 1000) {
      const stay = config.stays[(index + iteration) % config.stays.length];
      const image = config.images[(index + iteration) % config.images.length];
      await http(
        "page",
        website,
        config.publicPaths[iteration % config.publicPaths.length],
        undefined,
        undefined,
        (result) =>
          result.status === 200 &&
          result.contentType.includes("text/html") &&
          result.bytes > 0,
      );
      for (const [name, path] of [
        ["imageOriginal", image.original],
        ["imageOptimized", image.optimized],
      ])
        await http(
          name,
          website,
          path,
          undefined,
          undefined,
          (result) =>
            result.status === 200 &&
            result.contentType.startsWith("image/") &&
            result.bytes > 0,
        );
      await http(
        "catalogue",
        gateway,
        "/hw/room-types",
        undefined,
        undefined,
        collectionOk,
      );
      await http(
        "promotions",
        gateway,
        "/hw/promotions?limit=20",
        undefined,
        undefined,
        collectionOk,
      );
      await availability(stay);
      await http(
        "calendar",
        gateway,
        `/hw/room-types/${stay.roomTypeId}/availability-calendar?from=${stay.checkInDate}&to=${stay.checkOutDate}`,
        undefined,
        undefined,
        (result) => result.status === 200 && Array.isArray(result.body?.days),
      );
      const first = await quote(stay, token);
      if (first.ok) {
        const refreshed = await quote(stay, token, "quoteRefresh");
        if (refreshed.ok && iteration % config.bookingEvery === 0) {
          const reserved = await reserve(refreshed.body, token);
          if (reserved.status === 201 && uuid.test(reserved.body?.bookingId))
            await cleanup(reserved.body.bookingId, token);
        }
      }
      iteration++;
      cycles++;
      await sleep(config.thinkMs);
    }
  }
  try {
    if (tokens.some((token) => !token)) fatal = true;
    else {
      const results = await Promise.allSettled([
        race(),
        ...tokens.map((_, index) => user(index)),
      ]);
      fatal = results.some((result) => result.status === "rejected");
      if (results[0].status === "fulfilled") lastRoom = results[0].value;
    }
  } finally {
    for (const [id, token] of pending) await cleanup(id, token);
  }
  const summary = metrics.summarize(config.targets);
  const missing = operations.filter((name) => !summary[name]?.requests);
  const seconds = (performance.now() - loadStarted) / 1000;
  const requests = Object.values(summary).reduce(
    (sum, group) => sum + group.requests,
    0,
  );
  const measuredLoadRequests = requests - (summary.login?.requests || 0);
  return {
    runId,
    startedAt,
    finishedAt: new Date().toISOString(),
    passed:
      !fatal &&
      !missing.length &&
      lastRoom.passed &&
      !pending.size &&
      !uncertain.length &&
      Object.values(summary).every((group) => group.passed),
    metadata: config.metadata,
    targets: config.targets,
    workload: {
      users: config.users,
      durationSeconds: config.durationSeconds,
      rampSeconds: config.rampSeconds,
      thinkMs: config.thinkMs,
      timeoutMs: config.timeoutMs,
      bookingEvery: config.bookingEvery,
      publicPaths: config.publicPaths,
      images: config.images,
      stays: config.stays,
      lastRoom: config.lastRoom,
    },
    generator: {
      node: process.version,
      platform: platform(),
      logicalCpus: cpus().length,
      memoryBytes: totalmem(),
      rssBytes: process.memoryUsage().rss,
    },
    elapsedLoadAndCleanupSeconds: seconds,
    requestsIncludingSetup: requests,
    completedCycles: cycles,
    requestsPerSecondExcludingLogin: measuredLoadRequests / seconds,
    imagePayloadRatio:
      summary.imageOriginal?.meanBytes > 0
        ? (summary.imageOptimized?.meanBytes || 0) /
          summary.imageOriginal.meanBytes
        : null,
    missingOperations: missing,
    fatal,
    lastRoom,
    pendingBookingIds: [...pending.keys()],
    uncertainReservations: uncertain,
    metrics: summary,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    requireValue(
      process.argv[2],
      "Usage: npm run load -- config.local.json [report.json]",
    );
    const configPath = resolve(process.argv[2]);
    const config = JSON.parse(await readFile(configPath, "utf8"));
    const accounts = JSON.parse(
      await readFile(resolve(dirname(configPath), config.accountsFile), "utf8"),
    );
    const report = await runLoad(config, accounts);
    const output = resolve(process.argv[3] || "results/latest.json");
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify(report, null, 2) + "\n");
    console.log(
      `Performance checks ${report.passed ? "passed" : "failed"}; report: ${output}`,
    );
    process.exitCode = report.passed ? 0 : 1;
  } catch {
    // Do not print config, credentials, tokens, response bodies or raw network errors.
    console.error(
      "Performance run could not start. Check config, accounts file and approved targets.",
    );
    process.exitCode = 1;
  }
}
