const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function assert(condition) {
  if (!condition) throw new Error("Staging smoke assertion failed.");
}
function baseUrl(value) {
  const url = new URL(value);
  assert(
    url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash,
  );
  return url.origin;
}

export async function smoke(config, credentials, fetcher = fetch) {
  const website = baseUrl(config.websiteUrl),
    gateway = baseUrl(config.gatewayUrl);
  assert(uuid.test(config.roomTypeId) && uuid.test(config.paymentBookingId));
  assert(
    typeof credentials?.email === "string" &&
      typeof credentials.password === "string",
  );
  assert(
    Number.isFinite(config.timeoutMs) &&
      config.timeoutMs >= 100 &&
      config.timeoutMs <= 60000,
  );
  for (const path of [config.imagePath, config.optimizedImagePath]) {
    assert(
      typeof path === "string" &&
        path.startsWith("/") &&
        !path.startsWith("//") &&
        !/[\\\u0000-\u0020]/.test(path),
    );
    assert(new URL(path, website).origin === website);
  }
  assert(config.optimizedImagePath.startsWith("/_next/image?"));
  const checks = [];
  async function check(name, base, path, verify, options = {}) {
    try {
      const result = await fetcher(base + path, {
        ...options,
        redirect: "manual",
        signal: AbortSignal.timeout(config.timeoutMs),
      });
      // Consume within the deadline, including HTML streamed by Next.
      const text = await result.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        /* HTML and images are checked separately. */
      }
      assert(verify(result, text, json));
      checks.push({ name, passed: true });
      return json;
    } catch {
      checks.push({ name, passed: false });
      throw new Error(`Staging smoke failed: ${name}`);
    }
  }
  try {
    await check(
      "gateway_backend_health",
      gateway,
      "/hw/health",
      (r, _, b) =>
        r.status === 200 &&
        b?.status === "ok" &&
        b.database === "up" &&
        b.service === "hotel-website",
    );
    for (const path of ["/", "/rooms", "/offers", "/sign-in"])
      await check(
        `public_${path}`,
        website,
        path,
        (r, text) =>
          r.status === 200 &&
          r.headers.get("content-type")?.includes("text/html") &&
          text.includes("Forever City Hotel"),
      );
    await check(
      "catalogue",
      gateway,
      "/hw/room-types",
      (r, _, b) =>
        r.status === 200 &&
        Array.isArray(b?.items) &&
        b.items.some((room) => room.roomTypeId === config.roomTypeId),
    );
    await check(
      "promotions_gateway",
      gateway,
      "/hw/promotions?limit=20",
      (r, _, b) => r.status === 200 && Array.isArray(b?.items),
    );
    for (const path of [config.imagePath, config.optimizedImagePath])
      await check(
        path === config.imagePath ? "image_original" : "image_optimized",
        website,
        path,
        (r, body) =>
          r.status === 200 &&
          r.headers.get("content-type")?.startsWith("image/") &&
          body.length > 0,
        { headers: { Accept: "image/avif,image/webp,image/*" } },
      );
    await check(
      "unknown_route_404",
      website,
      "/__staging_smoke_missing_route__",
      (r) => r.status === 404,
    );
    const redirectToLogin = (r) => {
      const location = r.headers.get("location");
      if (![303, 307, 308].includes(r.status) || !location) return false;
      const target = new URL(location, website);
      return (
        target.origin === website &&
        target.pathname === "/sign-in" &&
        target.searchParams.has("returnTo")
      );
    };
    for (const path of [
      "/profile",
      `/profile/bookings/${config.paymentBookingId}`,
      `/booking/confirmation?bookingId=${config.paymentBookingId}&status=success`,
    ])
      await check(
        `protected_${path.split("?")[0]}`,
        website,
        path,
        redirectToLogin,
      );
    await check(
      "api_rejects_invalid_jwt",
      gateway,
      "/hw/bookings?category=upcoming&page=1",
      (r) => r.status === 401,
      { headers: { Authorization: "Bearer staging-smoke-invalid-token" } },
    );
    const auth = await check(
      "guest_login",
      gateway,
      "/hw/guests/login",
      (r, _, b) =>
        r.status === 200 &&
        typeof b?.accessToken === "string" &&
        /^[\w-]+\.[\w-]+\.[\w-]+$/.test(b.accessToken),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      },
    );
    const headers = { Authorization: `Bearer ${auth.accessToken}` };
    await check(
      "owned_profile_api",
      gateway,
      "/hw/bookings?category=upcoming&page=1",
      (r, _, b) => r.status === 200 && Array.isArray(b?.items),
      { headers },
    );
    await check(
      "unpaid_payment_status",
      gateway,
      `/hw/payments/${config.paymentBookingId}`,
      (r, _, b) =>
        r.status === 200 &&
        b?.bookingId === config.paymentBookingId &&
        b.paidAmount === 0 &&
        ["PENDING", "CANCELLED"].includes(b.status),
      { headers },
    );
    const cookie = { Cookie: `hw_guest_session=${auth.accessToken}` };
    await check(
      "authenticated_profile",
      website,
      "/profile",
      (r, text) => r.status === 200 && text.includes("My Bookings"),
      { headers: cookie },
    );
    await check(
      "return_cannot_claim_payment_success",
      website,
      `/booking/confirmation?bookingId=${config.paymentBookingId}&status=success`,
      (r, text) =>
        r.status === 200 &&
        !text.includes("Your stay is confirmed") &&
        (text.includes("Payment confirmation pending") ||
          text.includes("Checkout cancelled or expired")),
      { headers: cookie },
    );
    return { passed: true, checks };
  } catch {
    return { passed: false, checks };
  }
}
