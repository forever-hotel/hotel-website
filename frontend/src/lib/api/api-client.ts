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
