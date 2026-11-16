import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getRoomCatalogue,
  parseRoomCatalogue,
  roomPrice,
} from '../src/features/rooms/catalogue.ts';
import { getRoomImageHosts, safeRoomImage } from '../src/config/room-images.ts';

const room = {
  roomTypeId: '11111111-1111-4111-8111-111111111111',
  typeName: 'Deluxe Double',
  description: 'A comfortable double room.',
  pricePerNight: 250000,
  currency: 'LKR',
  maxGuests: 2,
  imageUrls: ['/images/forever-city-room.jpg'],
  amenities: ['Wi-Fi'],
};

test('catalogue parses API records and formats minor units as LKR', () => {
  assert.deepEqual(parseRoomCatalogue({ items: [room] }), [room]);
  assert.deepEqual(parseRoomCatalogue({ items: [] }), []);
  assert.match(roomPrice(room), /2,500\.00/);
  assert.equal(
    parseRoomCatalogue({
      items: [{ ...room, description: null, imageUrls: [] }],
    })[0].description,
    null,
  );
});

test('malformed catalogue records are not shown as bookable rooms', () => {
  for (const data of [
    null,
    3,
    {},
    { items: null },
    { items: [null] },
    { items: [3] },
    ...[
      { roomTypeId: 'bad' },
      { typeName: ' ' },
      { description: 3 },
      { pricePerNight: -1 },
      { pricePerNight: 1.5 },
      { currency: 'USD' },
      { maxGuests: 0 },
      { maxGuests: 1.5 },
      { imageUrls: null },
      { imageUrls: [3] },
      { amenities: null },
      { amenities: [3] },
    ].map((change) => ({ items: [{ ...room, ...change }] })),
    { items: [room, room] },
  ])
    assert.throws(() => parseRoomCatalogue(data));
});

test('image policy permits local image assets or explicitly approved HTTPS hosts', () => {
  const original = process.env.ROOM_IMAGE_HOSTS;
  try {
    delete process.env.ROOM_IMAGE_HOSTS;
    assert.deepEqual(getRoomImageHosts(), []);
    process.env.ROOM_IMAGE_HOSTS =
      ' cdn.example.com, *.bad.com, https://bad.com,127.0.0.1 ';
    assert.deepEqual(getRoomImageHosts(), ['cdn.example.com']);
    assert.equal(safeRoomImage('/images/room.webp'), '/images/room.webp');
    assert.equal(
      safeRoomImage('https://cdn.example.com/room.jpg?v=1'),
      'https://cdn.example.com/room.jpg?v=1',
    );
    for (const url of [
      '/images/../secret',
      '/images/%2e%2e/secret',
      '/images/a?x=1',
      '//evil.example/a.jpg',
      'javascript:alert(1)',
      'not a url',
      'http://cdn.example.com/a.jpg',
      'https://cdn.example.com:8080/a.jpg',
      'https://user:password@cdn.example.com/a.jpg',
      'https://other.example/a.jpg',
    ]) {
      assert.equal(safeRoomImage(url), undefined);
    }
    const clean = parseRoomCatalogue({
      items: [{ ...room, imageUrls: ['javascript:bad', '/images/room.webp'] }],
    });
    assert.deepEqual(clean[0].imageUrls, ['/images/room.webp']);
  } finally {
    if (original === undefined) delete process.env.ROOM_IMAGE_HOSTS;
    else process.env.ROOM_IMAGE_HOSTS = original;
  }
});

test('gateway catalogue distinguishes empty data from unavailable data', async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.API_GATEWAY_URL;
  try {
    delete process.env.API_GATEWAY_URL;
    assert.equal((await getRoomCatalogue()).state, 'unavailable');
    process.env.API_GATEWAY_URL = 'https://gateway.example';
    globalThis.fetch = async (url) => {
      assert.equal(url, 'https://gateway.example/hw/room-types');
      return Response.json({ items: [room] });
    };
    assert.deepEqual(await getRoomCatalogue(), {
      state: 'ready',
      rooms: [room],
    });
    globalThis.fetch = async () => Response.json({ items: [] });
    assert.deepEqual(await getRoomCatalogue(), { state: 'ready', rooms: [] });
    globalThis.fetch = async () => new Response('bad JSON');
    assert.equal((await getRoomCatalogue()).state, 'unavailable');
    globalThis.fetch = async () => new Response(null, { status: 503 });
    assert.equal((await getRoomCatalogue()).state, 'unavailable');
    globalThis.fetch = async () => {
      throw new Error('Timeout');
    };
    assert.equal((await getRoomCatalogue()).state, 'unavailable');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.API_GATEWAY_URL;
    else process.env.API_GATEWAY_URL = originalUrl;
  }
});
