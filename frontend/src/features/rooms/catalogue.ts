import { getGatewayJson } from '../../lib/api/api-client.ts';
import { safeRoomImage } from '../../config/room-images.ts';

export type RoomType = {
  roomTypeId: string;
  typeName: string;
  description: string | null;
  pricePerNight: number;
  currency: 'LKR';
  maxGuests: number;
  imageUrls: string[];
  amenities: string[];
};
export type RoomCatalogue =
  { state: 'ready'; rooms: RoomType[] } | { state: 'unavailable'; rooms: [] };

function isRoom(value: unknown): value is RoomType {
  if (!value || typeof value !== 'object') return false;
  const room = value as Record<string, unknown>;
  return (
    typeof room.roomTypeId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      room.roomTypeId,
    ) &&
    typeof room.typeName === 'string' &&
    room.typeName.trim().length > 0 &&
    (room.description === null || typeof room.description === 'string') &&
    typeof room.pricePerNight === 'number' &&
    Number.isSafeInteger(room.pricePerNight) &&
    room.pricePerNight >= 0 &&
    room.currency === 'LKR' &&
    typeof room.maxGuests === 'number' &&
    Number.isSafeInteger(room.maxGuests) &&
    room.maxGuests > 0 &&
    Array.isArray(room.imageUrls) &&
    room.imageUrls.every((item) => typeof item === 'string') &&
    Array.isArray(room.amenities) &&
    room.amenities.every((item) => typeof item === 'string')
  );
}

export function parseRoomCatalogue(data: unknown): RoomType[] {
  if (
    !data ||
    typeof data !== 'object' ||
    !('items' in data) ||
    !Array.isArray(data.items) ||
    !data.items.every(isRoom)
  )
    throw new Error('Invalid room catalogue');
  const rooms: RoomType[] = data.items;
  if (new Set(rooms.map((room) => room.roomTypeId)).size !== rooms.length)
    throw new Error('Duplicate room identifiers');
  return rooms.map((room) => ({
    ...room,
    imageUrls: room.imageUrls
      .map(safeRoomImage)
      .filter((url): url is string => Boolean(url)),
  }));
}

export async function getRoomCatalogue(): Promise<RoomCatalogue> {
  try {
    const data = await getGatewayJson('/hw/room-types');
    return { state: 'ready', rooms: parseRoomCatalogue(data) };
  } catch {
    return { state: 'unavailable', rooms: [] };
  }
}

export function roomPrice(room: RoomType): string {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: room.currency,
  }).format(room.pricePerNight / 100);
}
