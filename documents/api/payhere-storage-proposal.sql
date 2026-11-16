-- Proposal for forever-hotel/infra. Apply to disposable test databases only
-- until the infrastructure owner approves and deploys this enum migration.
-- Execute outside a transaction before inserting PAYHERE payments.
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'PAYHERE';
