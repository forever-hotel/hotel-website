import { postGatewayJson } from '@/lib/api/api-client';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: 'INVALID_ORIGIN' }, { status: 403 });
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    return Response.json({ error: 'INVALID_CONTENT_TYPE' }, { status: 415 });

  let input: unknown;
  try {
    const text = await request.text();
    if (text.length > 16000)
      return Response.json({ error: 'REQUEST_TOO_LARGE' }, { status: 413 });
    input = JSON.parse(text);
  } catch {
    return Response.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
  }

  try {
    const response = await postGatewayJson('/hw/contact/enquiries', input);
    if ([400, 429].includes(response.status))
      return Response.json(
        {
          error: response.status === 429 ? 'RATE_LIMITED' : 'VALIDATION_FAILED',
        },
        { status: response.status },
      );
    if (response.status !== 202) throw new Error('Gateway unavailable');
    const data: unknown = await response.json();
    if (
      !data ||
      typeof data !== 'object' ||
      !('status' in data) ||
      !['accepted', 'sandbox'].includes(String(data.status))
    )
      throw new Error('Invalid response');
    return Response.json(
      { status: data.status },
      { status: 202, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json({ error: 'CONTACT_UNAVAILABLE' }, { status: 503 });
  }
}
