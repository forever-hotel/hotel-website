import 'server-only';

export async function guestRequest(
  token: string,
  path: string,
): Promise<Response> {
  const base = process.env.API_GATEWAY_URL;
  if (!base) throw new Error('Gateway unavailable');
  return fetch(`${base.replace(/\/$/, '')}/hw${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
}
