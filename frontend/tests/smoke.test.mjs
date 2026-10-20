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
    const gateway = createHttpServer((request, response) => {
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
      assert.match(html, /Illustrative room previews/);
      assert.match(html, /src="[^\"]*hotel-pool/);
      assert.match(html, /id="offers"/);
      assert.match(html, /There are no offers to show right now/);
      assert.match(html, /<title>The Grand Meridian \| Forever Hotel<\/title>/);
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
      assert.equal(missing.status, 404);
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
