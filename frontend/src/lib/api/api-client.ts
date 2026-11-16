/** Server-side gateway access; leave unset for offline local development. */
export async function getGatewayJson(path: string): Promise<unknown> {
  const baseUrl = process.env.API_GATEWAY_URL;
  if (!baseUrl) return null;
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) throw new Error('Gateway request failed');
  return response.json();
}

export async function postGatewayJson(
  path: string,
  body: unknown,
): Promise<Response> {
  const baseUrl = process.env.API_GATEWAY_URL;
  if (!baseUrl) throw new Error('Gateway not configured');
  return fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
    cache: 'no-store',
  });
}
