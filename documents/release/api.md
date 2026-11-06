# Current website API index and demo requests

The implementation and generated development OpenAPI (`/docs-json`, UI `/docs`)
are authoritative for enabled controllers. The old
[contract draft](../api/hotel-website-contracts.md) includes proposals and is not
a list of shipped endpoints. Browser-facing requests use gateway `/hw`; the
gateway strips that prefix. Backend direct health is `/health`.

| Area                | Implemented gateway routes / guide                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Readiness           | `GET /hw/health` (checks DB readiness, not payment readiness)                                                                            |
| Guest auth          | `POST /hw/guests/register`, `POST /hw/guests/login`, `GET /hw/guests/me`; [auth guide](../api/frontend-authentication.md)                |
| Rooms               | `GET /hw/room-types`, `GET /hw/room-types/:id`; [backend catalogue](../../backend/README.md#room-catalogue-hw-03-ddp-11)                 |
| Availability        | `GET /hw/availability`, `GET /hw/room-types/:id/availability-calendar`; [contract](../api/availability.md)                               |
| Marketing           | `GET /hw/promotions?limit=20`; [interim contract and redemption gaps](../api/offers-contract-readiness.md)                               |
| Quotes/reservations | `POST /hw/booking-quotes`, `POST /hw/bookings`; [signed quote/idempotency contract](../api/booking-reservation-api.md)                   |
| PayHere             | Options, checkout, owned recovery/status/resume/cancel and signed notify; [exact routes/payloads](../api/payhere-checkout.md)            |
| Email               | Triggered after verified settlement/change; no browser fake-success endpoint; [states/retry guide](../api/booking-confirmation-email.md) |
| Guest bookings      | `GET /hw/bookings`, `GET /hw/bookings/:id`; [pagination and ownership](../api/guest-bookings.md)                                         |
| Booking management  | Owned eligibility, signed change preview/commit and cancellation; [contract](../api/booking-management.md)                               |
| Enquiries           | `POST /hw/contact/enquiries`; [validation and accepted/sandbox/error responses](../api/contact-enquiries.md)                             |

## PowerShell example (local demo, no charge)

After [local setup](setup.md), use a new test email for registration. UUID below
is the labelled local demo room type, not a production ID. Choose future dates.

```powershell
$gateway = 'http://localhost:8080'
$account = @{ fullName = 'Demo Guest'; email = 'demo@example.invalid'; password = 'local-demo-passphrase' }
Invoke-RestMethod -Method Post -Uri "$gateway/hw/guests/register" -ContentType 'application/json' -Body ($account | ConvertTo-Json)
$login = Invoke-RestMethod -Method Post -Uri "$gateway/hw/guests/login" -ContentType 'application/json' -Body (@{ email = $account.email; password = $account.password } | ConvertTo-Json)
$auth = @{ Authorization = "Bearer $($login.accessToken)" }
Invoke-RestMethod -Uri "$gateway/hw/guests/me" -Headers $auth
$stay = @{ roomTypeId = '33333333-3333-4333-8333-333333333333'; checkInDate = '2099-12-10'; checkOutDate = '2099-12-12'; numberOfGuests = 2 }
$quote = Invoke-RestMethod -Method Post -Uri "$gateway/hw/booking-quotes" -Headers $auth -ContentType 'application/json' -Body ($stay | ConvertTo-Json)
$quote | Select-Object quoteId,totalAmount,currency,expiresAt
```

The quote creates no hold. To reserve without payment, add a unique
`Idempotency-Key` header to `POST /hw/bookings` with `{ "quoteToken": "..." }`;
use the **same** key/body for a retry of that attempt. This creates an unpaid
PENDING booking, not a confirmation. Prefer the guided sandbox checkout demo
for the full lifecycle. Do not print/store bearer or quote tokens in shared
screenshots, command transcripts or artifacts. Runtime `.env` and real credentials
stay private.

Unknown identity/price/card fields are rejected; never calculate authoritative
prices in Postman or mark a booking confirmed from a return parameter. See the
[security review](../testing/security-review.md) and [HTTP contracts](../testing/booking-contracts.md).
