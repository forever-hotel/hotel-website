// Isolated UI acceptance checks. Requires `npm run build` and local Chrome/Edge.
// Uses a fixture gateway, never the configured hotel database or a real account.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const browserPath =
  process.env.CHROME_BIN ||
  [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].find(existsSync);
if (!browserPath)
  throw new Error('Set CHROME_BIN to a Chrome or Edge executable.');
const room = {
  roomTypeId: '11111111-1111-4111-8111-111111111111',
  typeName: 'UI Test Room',
  description: 'Isolated test fixture',
  pricePerNight: 2000000,
  currency: 'LKR',
  maxGuests: 2,
  imageUrls: [],
  amenities: ['Wi-Fi'],
};
let quoteStatus = 201;
let expired = false;
const calls = [];
const gateway = createServer(async (req, res) => {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  calls.push(req.url);
  let body;
  let status = 200;
  if (req.url === '/hw/room-types') body = { items: [room] };
  else if (req.url === '/hw/guests/me')
    body = { fullName: 'UI Test Guest', email: 'ui@example.com' };
  else if (req.url.startsWith('/hw/availability?'))
    body = { availableCount: 1 };
  else if (req.url.includes('/availability-calendar')) {
    const query = new URL(req.url, 'http://fixture.invalid').searchParams;
    const days = [];
    for (
      let day = Date.parse(query.get('from'));
      day < Date.parse(query.get('to'));
      day += 86400000
    )
      days.push({
        date: new Date(day).toISOString().slice(0, 10),
        availableCount: 1,
      });
    body = { days };
  } else if (req.url === '/hw/booking-quotes') {
    status = quoteStatus;
    const stay = JSON.parse(raw);
    const nights =
      (Date.parse(stay.checkOutDate) - Date.parse(stay.checkInDate)) / 86400000;
    body = {
      ...stay,
      quoteId: 'ui-preview',
      quoteToken: 'signed.preview',
      currency: 'LKR',
      nightlyRate: 2000000,
      nights,
      subtotal: nights * 2000000,
      additionalCharges: 0,
      totalAmount: nights * 2000000,
      lineItems: [],
      rateBasis: 'INCLUSIVE',
      expiresAt: new Date(
        Date.now() + (expired ? -1000 : 600000),
      ).toISOString(),
    };
  } else {
    status = 404;
    body = {};
  }
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
});
gateway.listen(0, '127.0.0.1');
await once(gateway, 'listening');
const portServer = createServer();
portServer.listen(0, '127.0.0.1');
await once(portServer, 'listening');
const port = portServer.address().port;
await new Promise((resolve) => portServer.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const profile = await mkdtemp(join(tmpdir(), 'hotel-booking-ui-'));
const app = spawn(
  process.execPath,
  [
    'node_modules/next/dist/bin/next',
    'start',
    '--hostname',
    '127.0.0.1',
    '--port',
    String(port),
  ],
  {
    env: {
      ...process.env,
      API_GATEWAY_URL: `http://127.0.0.1:${gateway.address().port}`,
    },
    windowsHide: true,
    stdio: 'ignore',
  },
);
const browser = spawn(
  browserPath,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { windowsHide: true, stdio: 'ignore' },
);
let socket;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check, label) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const result = await check();
      if (result) return result;
    } catch {
      /* Wait for startup/navigation. */
    }
    await sleep(100);
  }
  throw new Error(`Timed out: ${label}`);
}
try {
  await until(
    async () => (await fetch(`${origin}/sign-in`)).ok,
    'frontend startup',
  );
  const debugPort = await until(
    async () =>
      (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split(
        '\n',
      )[0],
    'browser startup',
  );
  const targets = await (
    await fetch(`http://127.0.0.1:${debugPort}/json/list`)
  ).json();
  socket = new WebSocket(
    targets.find((target) => target.type === 'page').webSocketDebuggerUrl,
  );
  await once(socket, 'open');
  let sequence = 0;
  const waiting = new Map();
  socket.addEventListener('message', (event) => {
    const response = JSON.parse(event.data);
    if (!response.id) return;
    const pending = waiting.get(response.id);
    waiting.delete(response.id);
    if (response.error) pending.reject(new Error(response.error.message));
    else pending.resolve(response.result);
  });
  function command(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      waiting.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await command('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }
  async function text(value) {
    try {
      await until(
        () =>
          evaluate(
            `document.body.textContent.includes(${JSON.stringify(value)})`,
          ),
        value,
      );
    } catch (error) {
      console.error(
        'Fixture browser page:',
        await evaluate('document.body.innerText'),
      );
      console.error('Fixture gateway paths:', calls);
      throw error;
    }
  }
  async function click(label) {
    await evaluate(
      `(() => { const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(label)}); if (!button || button.disabled) throw new Error('Button unavailable'); button.click(); })()`,
    );
  }
  async function fill(selector, value) {
    await evaluate(
      `(() => { const input = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); })()`,
    );
  }
  const stayQuery = `roomTypeId=${room.roomTypeId}&checkInDate=2099-12-10&checkOutDate=2099-12-12&numberOfGuests=2`;
  await command('Page.navigate', { url: `${origin}/booking?${stayQuery}` });
  await text('Sign in');
  assert.ok((await evaluate('location.href')).includes('returnTo='));
  await command('Network.setCookie', {
    name: 'hw_guest_session',
    value: 'fixture-session',
    url: origin,
    httpOnly: true,
    sameSite: 'Lax',
  });
  await command('Page.navigate', {
    url: `${origin}/booking?${stayQuery}&step=select`,
  });
  await text('Select room');
  await click('Search availability');
  assert.equal(await evaluate('location.pathname'), '/booking');
  assert.equal(
    await evaluate(
      `document.querySelectorAll('[aria-label="Booking progress"] li').length`,
    ),
    5,
  );
  await evaluate(`document.querySelector('a[href*="step=details"]').click()`);
  await text('Check price and continue');
  await evaluate(
    `(() => { const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Check price and continue'); button.click(); button.click(); })()`,
  );
  await text('Confirm email');
  assert.equal(calls.filter((url) => url === '/hw/booking-quotes').length, 1);
  await click('Review payment handoff');
  await text('Enter the email address shown on your guest account.');
  assert.equal(
    await evaluate(
      `getComputedStyle(document.querySelector('#confirmation-error')).color`,
    ),
    'rgb(180, 35, 24)',
  );
  await fill('input[type=email]:not([readonly])', 'ui@example.com');
  await click('Review payment handoff');
  await text('Ready for payment');
  await text('No payment has been taken and no room has been reserved.');
  await evaluate('history.back()');
  await text('Confirm email');
  assert.equal(
    await evaluate(
      `document.querySelector('input[type=email]:not([readonly])').value`,
    ),
    'ui@example.com',
  );
  await evaluate('history.forward()');
  await text('Ready for payment');
  await command('Page.reload');
  await text('Refreshing this page requires a new review.');
  await click('Back to Guest Info');
  await text('Confirm email');
  quoteStatus = 409;
  await click('Refresh quote');
  await text('This room is no longer available');
  quoteStatus = 401;
  await click('Refresh quote');
  await text('Your session has expired.');
  quoteStatus = 503;
  await click('Refresh quote');
  await text('We could not load your quote.');
  quoteStatus = 201;
  expired = true;
  await click('Refresh quote');
  await text('Your quote has expired.');
  assert.equal(
    await evaluate(
      `Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Review payment handoff').disabled`,
    ),
    true,
  );
  expired = false;
  await click('Refresh quote');
  await until(
    () =>
      evaluate(
        `!Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Review payment handoff').disabled`,
      ),
    'fresh quote ready',
  );
  await fill('input[name=checkOutDate]', '2099-12-13');
  assert.equal(
    await evaluate(
      `Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Review payment handoff').disabled`,
    ),
    true,
  );
  await click('Update stay and recheck');
  await text('Check price and continue');
  assert.ok(
    (await evaluate('location.href')).includes('checkOutDate=2099-12-13'),
  );
  await command('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 1,
    mobile: true,
  });
  assert.equal(
    await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),
    true,
  );
  await command('Page.navigate', {
    url: `${origin}/booking?${stayQuery.replace('numberOfGuests=2', 'numberOfGuests=3')}`,
  });
  await text('Check price and continue');
  await click('Check price and continue');
  await text('This room accommodates up to 2 guests.');
  assert.equal(calls.filter((url) => url === '/hw/bookings').length, 0);
  console.log(
    'PASS: browser booking selection, quote, email errors, handoff, refresh recovery, sold-out/session/outage/expiry and edited-date invalidation. No holds created.',
  );
} finally {
  socket?.close();
  browser.kill();
  app.kill();
  await new Promise((resolve) => gateway.close(resolve));
  // Remove only the dedicated temporary browser profile created above.
  await rm(profile, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 200,
  }).catch(() => {});
}
