/** Use the configured public origin rather than proxy headers supplied by a caller. */
export function isAllowedContactOrigin(
  request: Request,
  publicOrigin = process.env.APP_ORIGIN,
): boolean {
  const supplied = request.headers.get('origin');
  // Preserve access for non-browser clients; this public endpoint uses no session cookie.
  if (!supplied) return true;

  try {
    const expected = new URL(publicOrigin ?? request.url);
    if (
      publicOrigin !== undefined &&
      (expected.origin !== publicOrigin ||
        (expected.protocol !== 'https:' &&
          !(
            expected.protocol === 'http:' &&
            ['localhost', '127.0.0.1', '[::1]'].includes(expected.hostname)
          )))
    )
      return false;
    return supplied === expected.origin;
  } catch {
    return false;
  }
}
