-- Migration 00002 — Part 1: enum additions
-- Must run alone so PostgreSQL commits the new enum values before
-- any subsequent statement references them.

ALTER TYPE renewal_request_status ADD VALUE IF NOT EXISTS 'renewal_requested';
ALTER TYPE renewal_request_status ADD VALUE IF NOT EXISTS 'waiting_for_documents';
ALTER TYPE renewal_request_status ADD VALUE IF NOT EXISTS 'waiting_for_offer';
ALTER TYPE renewal_request_status ADD VALUE IF NOT EXISTS 'offer_available';
ALTER TYPE renewal_request_status ADD VALUE IF NOT EXISTS 'waiting_for_payment';
ALTER TYPE renewal_request_status ADD VALUE IF NOT EXISTS 'renewed';

DO $$ BEGIN CREATE TYPE renewal_offer_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
