# ADR 002: PayHere checkout for the Sri Lankan hotel

Status: provider change authorized by the user; shared enum migration pending
infrastructure-owner approval. Date: 23 October 2026.

The previous implementation used Stripe test checkout. The user selected PayHere
for the real Sri Lankan hotel after encountering Stripe country availability.
Brevo remains the booking email provider.

New checkout uses PayHere's hosted POST form, signed callbacks and corroborating
Retrieval API. Guest ownership, frozen pricing, the approved 35-minute hotel hold,
inventory locking and email failure isolation remain. Full payment only is enabled.

The shared payment_method enum needs an explicit PAYHERE value. The proposal is
in documents/api/payhere-storage-proposal.sql; runtime never alters the database.
Provider references and billing use internal payment snapshot metadata; stripe_ref
is not repurposed. The legacy Stripe webhook stays available for existing attempts,
but old holds cannot be resumed as PayHere orders.

PayHere cannot enforce unique order IDs or expire Checkout forms like Stripe
sessions. Distinct verified charges are recorded separately and late/duplicate
charges are flagged for manual refund review rather than confirming unavailable
inventory. Refund automation is deferred; live rollout requires a hotel-owned
approved account and an agreed staff refund/reconciliation process. See the
PayHere API guide for endpoints, configuration, tests and these operational limits.
