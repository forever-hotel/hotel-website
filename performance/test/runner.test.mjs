import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { runLoad, validateConfig } from "../run.mjs";
import { Metrics, percentile } from "../metrics.mjs";

const normalRoom = "11111111-1111-4111-8111-111111111111";
const raceRoom = "22222222-2222-4222-8222-222222222222";
const accounts = [
  { email: "one@example.invalid", password: "fixture-secret-one" },
  { email: "two@example.invalid", password: "fixture-secret-two" },
];
const stay = (roomTypeId) => ({
  roomTypeId,
  checkInDate: "2099-12-10",
  checkOutDate: "2099-12-12",
  numberOfGuests: 2,
});
function config(url) {
  return {
    websiteUrl: url,
    gatewayUrl: url,
    users: 2,
    durationSeconds: 0.3,
    rampSeconds: 0,
    thinkMs: 20,
    timeoutMs: 1000,
    bookingEvery: 1,
    publicPaths: ["/", "/rooms"],
    images: [
      {
        original: "/images/room.jpg",
        optimized: "/_next/image?url=%2Fimages%2Froom.jpg&w=640&q=75",
      },
    ],
    stays: [stay(normalRoom)],
    lastRoom: stay(raceRoom),
    targets: { p95Ms: 5000, maxErrorRate: 0 },
    metadata: {
      environment: "local-fixture",
      targetReference: "synthetic-only",
      hardware: "in-process HTTP fixture",
      dataset: "one isolated last-room slot; synthetic responses",
      gatewayTimeoutMs: 1000,
      managerTimeoutMs: 1000,
      systemWideTraffic: "none",
      revision: "fixture",
    },
  };
}

test("percentiles and threshold failures include slow requests, transport errors and payload sizes", () => {
  assert.equal(percentile([], 0.95), null);
  assert.equal(percentile([3, 1, 2], 0.95), 3);
  const metrics = new Metrics();
  metrics.record("search", { ms: 10, bytes: 100, status: 200 });
  metrics.record("search", {
    ms: 300,
    status: 504,
    error: true,
    timeout: true,
  });
  const result = metrics.summarize({ p95Ms: 200, maxErrorRate: 0.1 }).search;
  assert.equal(result.passed, false);
  assert.equal(result.errorRate, 0.5);
  assert.equal(result.timeouts, 1);
  assert.equal(result.bytes, 100);
  assert.equal(result.statuses[504], 1);
});

test("configuration refuses missing targets, duplicate guests and overlapping last-room inventory", () => {
  const valid = config("http://localhost:3001");
  assert.equal(validateConfig(valid, accounts), valid);
  for (const changed of [
    { targets: { p95Ms: null, maxErrorRate: null } },
    { users: 300 },
    { lastRoom: stay(normalRoom) },
    { websiteUrl: "https://user:secret@example.com" },
    { publicPaths: ["//other.example"] },
    { metadata: { ...valid.metadata, gatewayTimeoutMs: null } },
  ])
    assert.throws(() => validateConfig({ ...valid, ...changed }, accounts));
  assert.throws(() => validateConfig(valid, [accounts[0], accounts[0]]));
});

async function fixture(mode, execute) {
  const bookings = new Map();
  const quotes = new Map();
  let activeRace = 0;
  let reserveCount = 0;
  let raceCalls = 0;
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    let input = "";
    for await (const chunk of request) input += chunk;
    const body = input ? JSON.parse(input) : {};
    const send = (status, data) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(data));
    };
    if (url.pathname === "/hw/guests/login")
      return send(200, { accessToken: `fixture-token-${body.email}` });
    if (url.pathname === "/" || url.pathname === "/rooms") {
      response.writeHead(200, { "Content-Type": "text/html" });
      return response.end("<html>Rooms</html>");
    }
    if (
      url.pathname.startsWith("/images/") ||
      url.pathname === "/_next/image"
    ) {
      if (mode === "timeout" && url.pathname === "/_next/image") {
        // Leave only this response pending until the client's deadline expires.
        // A tiny deadline for every request can fail login on a busy machine.
        return;
      }
      if (mode === "imageFailure" && url.pathname === "/_next/image")
        return send(500, {});
      response.writeHead(200, { "Content-Type": "image/webp" });
      return response.end(
        Buffer.alloc(url.pathname === "/_next/image" ? 10 : 100),
      );
    }
    if (url.pathname === "/hw/room-types" || url.pathname === "/hw/promotions")
      return send(200, { items: [] });
    if (url.pathname === "/hw/availability")
      return send(200, {
        availableCount:
          url.searchParams.get("roomTypeId") === raceRoom
            ? Math.max(0, 1 - activeRace)
            : 100,
      });
    if (url.pathname.endsWith("/availability-calendar"))
      return send(200, { days: [] });
    if (url.pathname === "/hw/booking-quotes") {
      const token = randomUUID();
      quotes.set(token, body.roomTypeId);
      return send(201, { quoteToken: token, quoteId: randomUUID() });
    }
    if (url.pathname === "/hw/bookings") {
      const room = quotes.get(body.quoteToken);
      if (room === raceRoom) {
        raceCalls++;
        if (activeRace && mode !== "overbooking")
          return send(409, { error: "ROOM_UNAVAILABLE" });
        activeRace++;
      }
      const bookingId = randomUUID();
      bookings.set(bookingId, { room, token: request.headers.authorization });
      reserveCount++;
      if (mode === "malformedReservation")
        return send(201, { status: "PENDING" });
      return send(201, { bookingId, status: "PENDING" });
    }
    const id = url.pathname.split("/")[3];
    if (url.pathname.endsWith("/cancel")) {
      if (mode === "cleanupFailure") return send(503, {});
      if (bookings.get(id)?.room === raceRoom) activeRace--;
      bookings.delete(id);
      return send(201, { status: "CANCELLED" });
    }
    if (url.pathname.startsWith("/hw/payments/"))
      return send(200, { bookingId: id, status: "PENDING" });
    send(404, {});
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    await execute(config(`http://127.0.0.1:${server.address().port}`), {
      bookings,
      counts: () => ({ reserveCount, raceCalls }),
    });
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

test("mixed HTTP load measures every operation, checks persisted race winner and cleans up without reporting credentials", async () => {
  await fixture("normal", async (options, state) => {
    const result = await runLoad(options, accounts);
    assert.equal(result.passed, true, JSON.stringify(result));
    assert.equal(result.lastRoom.winners, 1);
    assert.equal(result.lastRoom.conflicts, 1);
    assert.equal(result.lastRoom.persisted, true);
    assert.equal(state.counts().raceCalls, 2);
    assert.ok(state.counts().reserveCount > 1);
    assert.equal(state.bookings.size, 0);
    assert.deepEqual(result.missingOperations, []);
    assert.ok(
      result.metrics.imageOriginal.meanBytes >
        result.metrics.imageOptimized.meanBytes,
    );
    assert.doesNotMatch(
      JSON.stringify(result),
      /fixture-secret|fixture-token|one@example|two@example|quoteToken/,
    );
  });
});

for (const mode of [
  "overbooking",
  "imageFailure",
  "cleanupFailure",
  "timeout",
  "malformedReservation",
]) {
  test(`fails the report for ${mode}`, async () => {
    await fixture(mode, async (options) => {
      if (mode === "timeout") options.timeoutMs = 5000;
      const result = await runLoad(options, accounts);
      assert.equal(result.passed, false);
      if (mode === "overbooking") assert.equal(result.lastRoom.passed, false);
      if (mode === "imageFailure")
        assert.ok(result.metrics.imageOptimized.errors > 0);
      if (mode === "cleanupFailure")
        assert.ok(result.pendingBookingIds.length > 0);
      if (mode === "timeout") {
        assert.equal(
          result.fatal,
          false,
          "Login setup must complete before testing image timeouts",
        );
        assert.ok(
          result.metrics.imageOptimized,
          "The workload must reach the stalled image request",
        );
        assert.ok(result.metrics.imageOptimized.timeouts > 0);
      }
      if (mode === "malformedReservation") {
        assert.ok(result.uncertainReservations.length > 0);
        assert.equal(
          typeof result.uncertainReservations[0].accountIndex,
          "number",
        );
      }
    });
  });
}
