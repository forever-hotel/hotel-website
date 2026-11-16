import { getGatewayJson } from '@/lib/api/api-client';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const roomTypeId = params.get('roomTypeId') || '';
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      roomTypeId,
    )
  )
    return Response.json({ error: 'Invalid room type.' }, { status: 400 });
  const calendar = params.get('calendar') === '1';
  const query = new URLSearchParams();
  for (const name of calendar
    ? ['from', 'to']
    : ['checkInDate', 'checkOutDate', 'numberOfGuests'])
    query.set(name, params.get(name) || '');
  if (!calendar) query.set('roomTypeId', roomTypeId);
  const path = calendar
    ? `/hw/room-types/${roomTypeId}/availability-calendar`
    : '/hw/availability';
  try {
    const data = await getGatewayJson(`${path}?${query}`);
    if (!data) throw new Error('Not configured');
    return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json(
      { error: 'Availability could not be checked. Please retry.' },
      { status: 503 },
    );
  }
}
