import assert from "node:assert/strict";
import { test } from "node:test";
import { smoke } from "../smoke.mjs";
const id = "11111111-1111-4111-8111-111111111111";
const config = {
  websiteUrl: "https://website.example",
  gatewayUrl: "https://gateway.example",
  imagePath: "/images/room.webp",
  optimizedImagePath: "/_next/image?url=%2Fimages%2Froom.webp&w=640&q=75",
  roomTypeId: id,
  paymentBookingId: id,
  timeoutMs: 1000,
};
const credentials = {
  email: "fixture@example.invalid",
  password: "fixture-private-password",
};
function fixture(mode = "") {
  return async (input, options) => {
    const url = new URL(input);
    const json = (body, status = 200) => Response.json(body, { status });
    const html = (body, status = 200) =>
      new Response(body, { status, headers: { "Content-Type": "text/html" } });
    if (url.pathname === "/hw/health")
      return json({
        status: "ok",
        database: mode === "health" ? "down" : "up",
        service: "hotel-website",
      });
    if (url.pathname === "/hw/promotions") return json({ items: [] });
    if (url.pathname === "/hw/room-types")
      return json({ items: [{ roomTypeId: id }] });
    if (url.pathname.startsWith("/images/") || url.pathname === "/_next/image")
      return new Response(mode === "image" ? "" : "image-bytes", {
        status: mode === "image" ? 404 : 200,
        headers: { "Content-Type": "image/webp" },
      });
    if (url.pathname === "/__staging_smoke_missing_route__")
      return html("missing", mode === "404" ? 200 : 404);
    if (url.pathname === "/hw/guests/login")
      return json({ accessToken: "fixture.header.signature" });
    if (url.pathname === "/hw/bookings")
      return options.headers.Authorization.includes("invalid")
        ? json({}, 401)
        : json({ items: [] });
    if (url.pathname.startsWith("/hw/payments/"))
      return json({
        bookingId: id,
        paidAmount: mode === "paid" ? 100 : 0,
        status: "PENDING",
      });
    if (
      url.pathname.startsWith("/profile") ||
      url.pathname === "/booking/confirmation"
    ) {
      if (!options.headers?.Cookie)
        return new Response(null, {
          status: 307,
          headers: {
            Location:
              mode === "redirect"
                ? "https://evil.example/sign-in"
                : "/sign-in?returnTo=%2Fprofile",
          },
        });
      return html(
        url.pathname === "/profile"
          ? "My Bookings"
          : mode === "falseSuccess"
            ? "Your stay is confirmed"
            : "Payment confirmation pending",
      );
    }
    return html("Forever City Hotel");
  };
}
test("smoke verifies public routes, gateway, ownership, login and unpaid payment return without exposing credentials", async () => {
  const result = await smoke(config, credentials, fixture());
  assert.equal(result.passed, true);
  assert.ok(result.checks.length >= 18);
  assert.doesNotMatch(
    JSON.stringify(result),
    /fixture-private|fixture.header|fixture@example/,
  );
});
for (const mode of [
  "health",
  "image",
  "404",
  "redirect",
  "paid",
  "falseSuccess",
]) {
  test(`smoke rejects ${mode} regression`, async () => {
    const result = await smoke(config, credentials, fixture(mode));
    assert.equal(result.passed, false);
    assert.ok(result.checks.some((check) => !check.passed));
  });
}
test("smoke refuses credentials embedded in destination URLs", async () => {
  await assert.rejects(
    smoke(
      { ...config, websiteUrl: "https://user:password@website.example" },
      credentials,
      fixture(),
    ),
  );
});
