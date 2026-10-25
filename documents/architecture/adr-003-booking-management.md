# ADR 003: Booking changes use signed previews and staff financial reconciliation

Status: Implemented for DDP-#28; production check-in time awaits hotel confirmation.

The user selected full refunds for eligible cancellation and staff review for
price differences. No approved check-in hour was present in the repository.
Development/test therefore use a provisional 14:00 Sri Lanka check-in; production
requires explicit versioned hotel policy rather than adopting that hour silently.

Modification previews use a separate signing domain from new reservations, bind
current booking/revision/payment state and expire in ten minutes. Commit locks
old/new inventory in sorted order, then the booking and payment rows, and checks
availability again while excluding the existing reservation.

Accepted changes/cancellations persist an idempotency record and change-email
receipt in existing checkout metadata. No new schema/table or cascade is added.
External email happens after commit with durable per-operation claims. Ambiguous
provider outcomes remain available for operator review instead of blind retries.

Financial differences are returned as balance due or pending staff refund review.
Cancellation releases inventory and records a full refund of currently paid
funds, but does not claim a refund was executed. Automated refunds, additional
payment collection, partial-refund reconciliation and a background email worker
require separate work and hotel/provider contracts. Dashboard controls are
DDP-#29. See [the API contract](../api/booking-management.md).
