-- ============================================================================
-- InsureCRM — Wizard Nullable Policy ID
-- ============================================================================
-- Allows `renewal_requests.policy_id` to be NULL so that "new policy" leads
-- can be submitted by clients through the portal wizard without an existing
-- policy record. The broker will create the policy when a quote is accepted.
-- ============================================================================

ALTER TABLE renewal_requests
  ALTER COLUMN policy_id DROP NOT NULL;

-- Add a column to capture the lead metadata for new-policy requests.
ALTER TABLE renewal_requests
  ADD COLUMN IF NOT EXISTS policy_type   text,
  ADD COLUMN IF NOT EXISTS insurer_name  text,
  ADD COLUMN IF NOT EXISTS is_new_policy boolean NOT NULL DEFAULT false;

-- Helpful index for broker views that filter on new-policy leads.
CREATE INDEX IF NOT EXISTS idx_renewal_requests_is_new_policy
  ON renewal_requests(is_new_policy) WHERE is_new_policy = true;
