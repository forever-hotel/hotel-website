# Contact enquiries (DDP-#15)

## Status

Implemented locally in the Website backend. Gateway mapping is proposed and
still needs gateway-owner confirmation. Management recipient, verified sender,
provider credentials and team identities are not guessed. Delivery defaults to
**off**; tests never contact a real provider.

## Flow and request

```text
Browser POST /api/contact (Next.js)
  -> POST /hw/contact/enquiries (API Gateway strips /hw before forwarding)
  -> POST /contact/enquiries (Website backend)
  -> Brevo (only when configured)
```

The frontend uses server-only `API_GATEWAY_URL`, never a direct subsystem URL.

```json
{
  "name": "Nimali Perera",
  "email": "nimali@example.test",
  "phone": "+94771234567",
  "subject": "General enquiry",
  "message": "Please tell me about room options for my visit."
}
```

- Name: trimmed, 2–100 characters, no carriage return/newline.
- Email: trimmed valid email, maximum 254 characters.
- Phone: optional (omit when blank), 7–25 characters using digits, spaces, `+`,
  `(`, `)` and `-`. This validates format, not reachability.
- Subject: General enquiry, Rooms and stays, Events, or Other.
- Message: trimmed, 10–3000 characters.
- Unknown fields are rejected by the shared validation pipe.

## Responses

| HTTP                        | Meaning                                                                     |
| --------------------------- | --------------------------------------------------------------------------- |
| 202 `{"status":"accepted"}` | Provider accepted the message; inbox delivery is not confirmed.             |
| 202 `{"status":"sandbox"}`  | Provider validated the test request; no email was sent.                     |
| 400 `VALIDATION_FAILED`     | Invalid input, shared error envelope.                                       |
| 429 `RATE_LIMITED`          | Local connection-IP request limit; wait one minute.                         |
| 503 `CONTACT_UNAVAILABLE`   | Disabled/invalid configuration, provider error, network failure or timeout. |

The Next.js bridge preserves 400/429, maps invalid/unavailable upstream responses
to 503, and never returns raw provider responses. It rejects foreign Origin
headers (403), non-JSON content (415), malformed JSON (400) and text over 16,000
characters (413). Ingress must additionally enforce byte limits before buffering.

The form prevents concurrent repeated clicks, retains inputs after failure or
sandbox validation, and clears only after acceptance. It does not automatically
retry uncertain requests. A retry after timeout may duplicate a message already
accepted upstream; exactly-once email delivery is not claimed.

## Configuration

Set only in the backend environment; do not commit actual credentials:

```dotenv
CONTACT_EMAIL_MODE=off
BREVO_API_KEY=
CONTACT_EMAIL_FROM=
CONTACT_EMAIL_TO=
```

`off` is the default (503, no send). `sandbox` validates through Brevo with no
delivery and expects provider HTTP 201 with a messageId. `send` performs real dispatch and expects
provider HTTP 201 with a messageId. Sender/recipient must be valid addresses and the sender must
be verified with Brevo. The exact hotel recipient still needs confirmation.

Email is plain text with a fixed subject prefix and validated subject choice.
The guest is Reply-To, never the authenticated From address. This feature does
not store/log enquiry bodies, secrets or raw provider errors. Sender/recipient
are configured server-side and never taken from browser-supplied routing fields.

Timeouts: Brevo 8 seconds, Next gateway request 10 seconds, browser 12 seconds.
The bounded in-memory Nest guard allows five requests per connection IP per
minute. It does not trust arbitrary forwarded headers or provide distributed
throttling. Behind a gateway, IPs may be shared; configure per-client limits at
trusted ingress before production sending. Do not enable unrestricted proxy trust.

Provider references: [Mail Send](https://developers.brevo.com/docs/send-a-transactional-email),
[sandbox semantics](https://developers.brevo.com/docs/using-sandbox-mode).

## Location and UI

Address: 243/3, Makola Road, Kiribathgoda, 11600, Sri Lanka, verified from the
[property listing](https://www.booking.com/hotel/lk/forever-city.html) on
21 October 2026. The embed searches the name/address rather than invented pin
coordinates. Have hotel staff confirm the final map placement before release.

The text address and directions link are outside the iframe and do not depend
on it loading. The form remains usable if the map is blocked. Staff identities,
portraits, direct contacts and social accounts remain unfilled until confirmed.
The page explains that team introductions will be added later.

## Verification

Backend checks exercise HTTP validation, trimming, throttling, disabled/bad
configuration, plain-text recipient/Reply-To, sandbox/accepted response semantics,
provider failure and timeout. Frontend checks cover feedback/gateway requests,
route content, text address outside iframe, form fields, request errors and
upstream acceptance/failure. Browser checks for actual map blocking, layout,
keyboard use and duplicate-click behaviour remain required before release.
