import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { test } from 'node:test';
import { setTimeout } from 'node:timers/promises';

test(
  'the app serves the welcome page and returns 404 for unknown routes',
  { timeout: 90000 },
  async () => {
    const reservation = createServer();
    reservation.listen(0, '127.0.0.1');
    await once(reservation, 'listening');
    const { port } = reservation.address();
    await new Promise((resolve) => reservation.close(resolve));

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
      { stdio: ['ignore', 'pipe', 'pipe'] },
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
      assert.match(html, /<h1>A warm welcome awaits\.<\/h1>/);
      assert.match(html, /<title>Forever Hotel<\/title>/);
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
    }
  },
);
