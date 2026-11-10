import assert from 'node:assert/strict';
import { test } from 'node:test';
import { submitEnquiry } from '../src/lib/api/contact-client.ts';
import { postGatewayJson } from '../src/lib/api/api-client.ts';
import { isAllowedContactOrigin } from '../src/lib/api/contact-origin.ts';

const enquiry = {
  name: 'Nimali',
  email: 'nimali@example.test',
  subject: 'General enquiry',
  message: 'Please tell me about your rooms.',
};

test('contact accepts the configured public HTTPS origin behind an internal HTTP proxy', () => {
  const publicOrigin = 'https://hotel.example';
  const request = new Request('http://0.0.0.0:3001/api/contact', {
    method: 'POST',
    headers: { Origin: publicOrigin },
  });
  assert.equal(isAllowedContactOrigin(request, publicOrigin), true);
  assert.equal(isAllowedContactOrigin(request, undefined), false);
});

test('contact rejects foreign, opaque and forged forwarded origins', () => {
  for (const origin of [
    'https://attacker.example',
    'https://hotel.example.attacker.example',
    'http://hotel.example',
    'https://hotel.example:444',
    'null',
  ]) {
    const request = new Request('http://0.0.0.0:3001/api/contact', {
      method: 'POST',
      headers: {
        Origin: origin,
        Host: 'attacker.example',
        'X-Forwarded-Host': 'attacker.example',
        'X-Forwarded-Proto': 'https',
      },
    });
    assert.equal(
      isAllowedContactOrigin(request, 'https://hotel.example'),
      false,
    );
  }
});

test('contact permits local same-origin and non-browser callers without trusting invalid configuration', () => {
  const local = new Request('http://localhost:3001/api/contact', {
    method: 'POST',
    headers: { Origin: 'http://localhost:3001' },
  });
  assert.equal(isAllowedContactOrigin(local, undefined), true);
  assert.equal(isAllowedContactOrigin(local, 'http://localhost:3001'), true);
  assert.equal(isAllowedContactOrigin(new Request(local.url)), true);
  for (const origin of [
    '',
    'invalid',
    'https://hotel.example/path',
    'https://user:password@hotel.example',
    'https://hotel.example?query=1',
    'http://hotel.example',
  ]) {
    assert.equal(isAllowedContactOrigin(local, origin), false);
  }
});

test('contact feedback distinguishes provider acceptance, sandbox and failures', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/contact');
      assert.equal(options.method, 'POST');
      assert.deepEqual(JSON.parse(options.body), enquiry);
      return Response.json({ status: 'accepted' }, { status: 202 });
    };
    assert.equal((await submitEnquiry(enquiry)).accepted, true);
    for (const [status, data, expected] of [
      [202, { status: 'sandbox' }, /no email was sent/],
      [400, {}, /check your name/],
      [429, {}, /wait a minute/],
      [503, {}, /could not confirm/],
      [202, { status: 'other' }, /could not confirm/],
      [202, null, /could not confirm/],
      [202, {}, /could not confirm/],
    ]) {
      globalThis.fetch = async () => Response.json(data, { status });
      const result = await submitEnquiry(enquiry);
      assert.equal(result.accepted, false);
      assert.match(result.message, expected);
    }
    globalThis.fetch = async () => new Response('not-json', { status: 202 });
    assert.equal((await submitEnquiry(enquiry)).accepted, false);
    globalThis.fetch = async () => {
      throw new DOMException('Timeout', 'TimeoutError');
    };
    assert.equal((await submitEnquiry(enquiry)).accepted, false);
  } finally {
    globalThis.fetch = original;
  }
});

test('gateway POST uses server config and never sends when unconfigured', async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.API_GATEWAY_URL;
  try {
    delete process.env.API_GATEWAY_URL;
    await assert.rejects(() =>
      postGatewayJson('/hw/contact/enquiries', enquiry),
    );
    process.env.API_GATEWAY_URL = 'https://gateway.example/';
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://gateway.example/hw/contact/enquiries');
      assert.equal(options.cache, 'no-store');
      assert.equal(options.method, 'POST');
      assert.ok(options.signal instanceof AbortSignal);
      return Response.json({ status: 'accepted' }, { status: 202 });
    };
    assert.equal(
      (await postGatewayJson('/hw/contact/enquiries', enquiry)).status,
      202,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.API_GATEWAY_URL;
    else process.env.API_GATEWAY_URL = originalUrl;
  }
});
