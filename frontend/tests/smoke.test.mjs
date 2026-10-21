import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { createServer as createHttpServer } from 'node:http';
import { test } from 'node:test';
import { setTimeout } from 'node:timers/promises';

test(
  'home content, active offers, empty offers and unavailable gateway render safely',
  { timeout: 90000 },
  async () => {
    const reservation = createServer();
    reservation.listen(0, '127.0.0.1');
    await once(reservation, 'listening');
    const { port } = reservation.address();
    await new Promise((resolve) => reservation.close(resolve));

    let offers = [];
    let gatewayStatus = 200;
    let contactStatus = 202;
    let contactResult = { status: 'accepted' };
    let lastEnquiry;
    const room = {
      roomTypeId: '11111111-1111-4111-8111-111111111111',
      typeName: 'API Deluxe Double',
      description: 'A room from the catalogue API.',
      pricePerNight: 250000,
      currency: 'LKR',
      maxGuests: 2,
      imageUrls: ['/images/forever-city-room.jpg'],
      amenities: ['Wi-Fi', 'Air conditioning'],
    };
    const secondRoom = {
      ...room,
      roomTypeId: '22222222-2222-4222-8222-222222222222',
      typeName: 'API Family Room',
      imageUrls: [],
      description: null,
      amenities: [],
    };
    let roomItems = [room, secondRoom];
    let roomStatus = 200;
    const gateway = createHttpServer((request, response) => {
      if (request.url === '/hw/room-types') {
        response.writeHead(roomStatus, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ items: roomItems, nextCursor: null }));
        return;
      }
      if (request.url === '/hw/contact/enquiries') {
        assert.equal(request.method, 'POST');
        let body = '';
        request.on('data', (chunk) => {
          body += chunk;
        });
        request.on('end', () => {
          lastEnquiry = JSON.parse(body);
          response.writeHead(contactStatus, {
            'Content-Type': 'application/json',
          });
          response.end(JSON.stringify(contactResult));
        });
        return;
      }
      assert.equal(request.url, '/api/v1/promotions?limit=20');
      response.writeHead(gatewayStatus, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ items: offers, nextCursor: null }));
    });
    gateway.listen(0, '127.0.0.1');
    await once(gateway, 'listening');

    const server = spawn(
      process.execPath,
      [
        'node_modules/next/dist/bin/next',
        process.env.SMOKE_MODE === 'dev' ? 'dev' : 'start',
        '--hostname',
        '127.0.0.1',
        '--port',
        String(port),
      ],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          API_GATEWAY_URL: `http://127.0.0.1:${gateway.address().port}`,
        },
      },
    );
    let output = '';
    server.stdout.on('data', (chunk) => {
      output += chunk;
    });
    server.stderr.on('data', (chunk) => {
      output += chunk;
    });
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      let response;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        assert.equal(server.exitCode, null, output);
        try {
          response = await fetch(baseUrl, {
            signal: AbortSignal.timeout(1000),
          });
          break;
        } catch {
          await setTimeout(500);
        }
      }
      assert.ok(response, `App did not start.\n${output}`);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.match(html, /<html lang="en"/);
      assert.match(html, /Where <em>Elegance<\/em>/);
      assert.match(html, /Meets Comfort/);
      assert.match(html, /id="our-hotel"/);
      for (const section of [
        'services',
        'rooms',
        'faq',
        'contact',
        'plan-stay',
      ]) {
        assert.match(html, new RegExp(`id="${section}"`));
      }
      assert.match(html, /Our <em>Finest<\/em> Rooms/);
      assert.match(html, /Frequently Asked/);
      assert.match(html, /<details open=""/);
      assert.match(html, /API Deluxe Double/);
      assert.match(html, /2,500\.00/);
      assert.doesNotMatch(html, /sample rate|\$180|\$280|\$580/);
      assert.match(html, /src="[^\"]*forever-city-pool/);
      assert.match(html, /id="offers"/);
      assert.match(html, /<dt>20\+<\/dt><dd>Years of experience<\/dd>/);
      assert.match(html, /<dt>30\+<\/dt>/);
      assert.match(html, /<dt>5\+<\/dt>/);
      assert.match(html, /Guest satisfaction/);
      assert.match(html, /id="hotel-policies"/);
      assert.match(html, /Check-in is from 2:00 PM/);
      assert.doesNotMatch(
        html,
        /statistics below await|not confirmed hotel policies|design location/,
      );
      assert.match(html, /aria-label="Explore the hotel"/);
      assert.match(html, /aria-label="Guest information"/);
      assert.match(html, /href="\/services"/);
      assert.doesNotMatch(html, /href="\/about(?:["/#?])/);
      // Check actual rendered anchors, not the scripts used for streamed content.
      const pageIds = new Set(
        [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]),
      );
      for (const anchor of html.matchAll(/<a\b[^>]*\bhref="\/?#([^"]+)"/g)) {
        assert.ok(pageIds.has(anchor[1]), `Broken Home link: ${anchor[1]}`);
      }
      assert.match(html, /There are no offers to show right now/);
      assert.match(html, /<title>Forever City Hotel<\/title>/);
      assert.doesNotMatch(html, /The Grand Meridian/);
      const active = {
        promoId: 'active',
        code: 'ACTIVE10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        currency: 'LKR',
        roomTypeIds: [],
        validFrom: new Date(Date.now() - 60000).toISOString(),
        validUntil: new Date(Date.now() + 3600000).toISOString(),
      };
      offers = [
        active,
        {
          ...active,
          promoId: 'expired',
          code: 'EXPIRED10',
          validUntil: new Date(Date.now() - 1).toISOString(),
        },
        {
          ...active,
          promoId: 'future',
          code: 'FUTURE10',
          validFrom: new Date(Date.now() + 86400000).toISOString(),
        },
        {
          ...active,
          promoId: 'fixed',
          code: 'FIXED2500',
          discountType: 'FIXED',
          discountValue: 250000,
          roomTypeIds: ['room-1'],
        },
      ];
      const activeHtml = await (await fetch(baseUrl)).text();
      assert.match(activeHtml, /ACTIVE10/);
      assert.match(activeHtml, /10% off/);
      assert.match(activeHtml, /FIXED2500/);
      assert.match(activeHtml, /2,500\.00 off/);
      assert.match(activeHtml, /Applies to selected room types/);
      assert.doesNotMatch(activeHtml, /EXPIRED10|FUTURE10/);
      gatewayStatus = 503;
      const unavailable = await fetch(baseUrl);
      assert.equal(unavailable.status, 200);
      assert.match(
        await unavailable.text(),
        /There are no offers to show right now/,
      );
      const missing = await fetch(`${baseUrl}/does-not-exist`);
      const contactResponse = await fetch(`${baseUrl}/contact`);
      assert.equal(contactResponse.status, 200);
      const contactHtml = await contactResponse.text();
      assert.match(contactHtml, /Contact Us \| Forever City Hotel/);
      const withoutMap = contactHtml.replace(
        /<iframe\b[^>]*>[\s\S]*?<\/iframe>/g,
        '',
      );
      assert.match(withoutMap, /243\/3, Makola Road, Kiribathgoda/);
      assert.match(withoutMap, /Send Us a/);
      assert.match(withoutMap, /Open directions in Google Maps/);
      for (const field of ['name', 'email', 'phone', 'subject', 'message']) {
        assert.ok(contactHtml.includes(`name="${field}"`));
      }
      assert.match(
        contactHtml,
        /Team introductions and direct contact details/,
      );
      assert.match(html, /href="\/contact"/);
      const enquiry = {
        name: 'Nimali',
        email: 'nimali@example.test',
        subject: 'General enquiry',
        message: 'I would like to ask about rooms.',
      };
      const submit = (body = JSON.stringify(enquiry), headers = {}) =>
        fetch(`${baseUrl}/api/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body,
        });
      let submitted = await submit();
      assert.equal(submitted.status, 202);
      assert.deepEqual(await submitted.json(), { status: 'accepted' });
      assert.deepEqual(lastEnquiry, enquiry);
      contactResult = { status: 'sandbox' };
      submitted = await submit();
      assert.deepEqual(await submitted.json(), { status: 'sandbox' });
      for (const status of [400, 429, 503]) {
        contactStatus = status;
        assert.equal((await submit()).status, status);
      }
      contactStatus = 202;
      contactResult = { status: 'unexpected' };
      assert.equal((await submit()).status, 503);
      assert.equal((await submit('not-json')).status, 400);
      assert.equal((await submit('x'.repeat(16001))).status, 413);
      assert.equal(
        (await submit(undefined, { Origin: 'https://unrelated.example' }))
          .status,
        403,
      );
      assert.equal(
        (await submit(undefined, { 'Content-Type': 'text/plain' })).status,
        415,
      );
      const servicesResponse = await fetch(`${baseUrl}/services`);
      assert.equal(servicesResponse.status, 200);
      const servicesHtml = await servicesResponse.text();
      assert.match(
        servicesHtml,
        /Services &amp; Facilities \| Forever City Hotel/,
      );
      for (const name of [
        'Spa &amp; Wellness Centre',
        'WON Restaurant',
        'Meeting Rooms',
        'Infinity Swimming Pool',
        'State-of-the-Art Gym',
        'Mini Function Hall',
        'Karaoke Rooms',
        'Scenic Photo Locations',
      ]) {
        assert.ok(servicesHtml.includes(name), `Missing facility: ${name}`);
      }
      assert.match(servicesHtml, /Illustrative image/);
      assert.doesNotMatch(servicesHtml, /Photograph coming soon/);
      for (const asset of ['spa', 'gym', 'meeting', 'function', 'karaoke']) {
        const imageResponse = await fetch(
          `${baseUrl}/images/illustrative-${asset}.webp`,
        );
        assert.equal(imageResponse.status, 200);
        assert.match(imageResponse.headers.get('content-type'), /image\/webp/);
      }
      assert.match(
        servicesHtml,
        /Online facility reservations are not available yet/,
      );
      assert.match(servicesHtml, /honeymoon packages/);
      assert.match(servicesHtml, /href="\/#offers"/);
      assert.match(servicesHtml, /id="main-content"/);
      assert.doesNotMatch(servicesHtml, /The Grand Meridian/);
      assert.equal(missing.status, 404);
      const roomsResponse = await fetch(`${baseUrl}/rooms`);
      assert.equal(roomsResponse.status, 200);
      const roomsHtml = await roomsResponse.text();
      assert.match(roomsHtml, /Rooms &amp; Suites \| Forever City Hotel/);
      assert.match(roomsHtml, /API Deluxe Double/);
      assert.match(roomsHtml, /API Family Room/);
      assert.match(roomsHtml, /Room photograph unavailable/);
      assert.match(roomsHtml, /Availability: check dates/);
      assert.match(roomsHtml, /Room details/);
      assert.match(roomsHtml, /type="checkbox"/);
      assert.match(roomsHtml, /Select two or three room types to compare/);
      assert.match(roomsHtml, /disabled=""[^>]*aria-expanded="false"/);
      assert.doesNotMatch(roomsHtml, /Room comparison is coming soon/);
      assert.match(roomsHtml, /Wi-Fi/);
      assert.match(roomsHtml, /Up to <!-- -->2<!-- --> guests/);
      const filtered = await (
        await fetch(`${baseUrl}/rooms?roomTypeId=${room.roomTypeId}`)
      ).text();
      // The unselected room remains a filter option, but must not be a card heading.
      assert.match(filtered, /<h3>API Deluxe Double<\/h3>/);
      assert.doesNotMatch(filtered, /<h3>API Family Room<\/h3>/);
      const unknown = await fetch(`${baseUrl}/rooms?roomTypeId=unknown`);
      assert.match(await unknown.text(), /Room type not found/);
      roomItems = [];
      assert.match(
        await (await fetch(`${baseUrl}/rooms`)).text(),
        /There are no room types/,
      );
      assert.match(
        await (await fetch(baseUrl)).text(),
        /There are no room types/,
      );
      roomStatus = 503;
      assert.match(
        await (await fetch(`${baseUrl}/rooms`)).text(),
        /Rooms are temporarily unavailable/,
      );
      assert.match(
        await (await fetch(baseUrl)).text(),
        /Rooms are temporarily unavailable/,
      );
      const about = await fetch(`${baseUrl}/about`);
      assert.equal(about.status, 404);
    } finally {
      if (server.exitCode === null) {
        const stopped = once(server, 'exit');
        if (process.platform === 'win32' && process.env.SMOKE_MODE === 'dev') {
          execFileSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], {
            stdio: 'ignore',
          });
        } else {
          server.kill();
        }
        await stopped;
      }
      gateway.closeAllConnections();
      await new Promise((resolve) => gateway.close(resolve));
    }
  },
);
