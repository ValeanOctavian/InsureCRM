-- ============================================================================
-- InsureCRM — Portal Overhaul Migration
-- ============================================================================
-- Adds:
--   * new renewal_request_status values (with safe rename of old ones)
--   * auth_user_id link on clients (replaces fragile email match)
--   * Romanian ID fields + profile_completed flag on clients
--   * renewal_offers table (broker → client 1..N offers)
--   * renewal_request_documents link table
--   * handle_new_user updated to also INSERT clients on self-register
--   * RLS policies switched to auth_user_id
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 0. CLEANUP — drop policies we'll recreate
-- ────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "Clients can read own record" ON clients;
  DROP POLICY IF EXISTS "Clients read own vehicles" ON vehicles;
  DROP POLICY IF EXISTS "Clients read own policies" ON policies;
  DROP POLICY IF EXISTS "Clients manage own documents" ON documents;
  DROP POLICY IF EXISTS "Clients read tasks related to them" ON tasks;
  DROP POLICY IF EXISTS "Clients read own reminders" ON reminders;
  DROP POLICY IF EXISTS "Clients manage own renewal requests" ON renewal_requests;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. ENUMS — add new values (additive; old values are kept for safety)
-- ────────────────────────────────────────────────────────────────────────────

ALTER TYPE renewal_request_status ADD VALUE IF NOT EXISTS 'renewal_requested';
ALTER TYPE renewal_request_status ADD VALUE IF NOT EXISTS 'waiting_for_documents';
ALTER TYPE renewal_request_status ADD VALUE IF NOT EXISTS 'waiting_for_offer';
ALTER TYPE renewal_request_status ADD VALUE IF NOT EXISTS 'offer_available';
ALTER TYPE renewal_request_status ADD VALUE IF NOT EXISTS 'waiting_for_payment';
ALTER TYPE renewal_request_status ADD VALUE IF NOT EXISTS 'renewed';

DO $$ BEGIN CREATE TYPE renewal_offer_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. MIGRATE existing renewal_requests rows from old → new status values
-- ────────────────────────────────────────────────────────────────────────────

UPDATE renewal_requests SET status = 'renewal_requested'      WHERE status = 'requested';
UPDATE renewal_requests SET status = 'waiting_for_documents'  WHERE status = 'documents_needed';
UPDATE renewal_requests SET status = 'renewed'                WHERE status = 'issued';

-- ────────────────────────────────────────────────────────────────────────────
-- 3. CLIENTS — add columns
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS auth_user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS birth_date        date,
  ADD COLUMN IF NOT EXISTS id_series         text,
  ADD COLUMN IF NOT EXISTS id_number         text,
  ADD COLUMN IF NOT EXISTS id_issued_by      text,
  ADD COLUMN IF NOT EXISTS id_issued_date    date,
  ADD COLUMN IF NOT EXISTS id_expiry_date    date,
  ADD COLUMN IF NOT EXISTS profile_completed boolean NOT NULL DEFAULT false;

-- Backfill auth_user_id from profiles where email matches.
UPDATE clients c
SET auth_user_id = p.user_id
FROM profiles p
WHERE p.email = c.email
  AND c.auth_user_id IS NULL;

-- Partial unique index on auth_user_id (allow multiple NULLs).
CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_auth_user_id
  ON clients(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Partial unique index on cnp (allow multiple NULLs but enforce uniqueness when present).
CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_cnp
  ON clients(cnp) WHERE cnp IS NOT NULL;

-- Index for login lookups.
CREATE INDEX IF NOT EXISTS idx_clients_auth_user_id ON clients(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_profile_completed ON clients(profile_completed);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. RENEWAL_REQUESTS — add columns
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE renewal_requests
  ADD COLUMN IF NOT EXISTS notes              text,
  ADD COLUMN IF NOT EXISTS selected_offer_id  uuid,
  ADD COLUMN IF NOT EXISTS confirmed_fields   jsonb;

CREATE INDEX IF NOT EXISTS idx_renewal_requests_status
  ON renewal_requests(status);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. RENEWAL_OFFERS — new table
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS renewal_offers (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_request_id uuid NOT NULL REFERENCES renewal_requests(id) ON DELETE CASCADE,
  broker_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  insurer_name       text NOT NULL,
  coverage_type      text NOT NULL,
  price              numeric(12,2) NOT NULL,
  currency           text NOT NULL DEFAULT 'RON',
  notes              text,
  status             renewal_offer_status NOT NULL DEFAULT 'pending',
  responded_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_renewal_offers_request ON renewal_offers(renewal_request_id);
CREATE INDEX IF NOT EXISTS idx_renewal_offers_status  ON renewal_offers(status);

ALTER TABLE renewal_offers ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. RENEWAL_REQUEST_DOCUMENTS — link table
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS renewal_request_documents (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_request_id uuid NOT NULL REFERENCES renewal_requests(id) ON DELETE CASCADE,
  document_id        uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  required_type      document_type NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE(renewal_request_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_rrd_request ON renewal_request_documents(renewal_request_id);

ALTER TABLE renewal_request_documents ENABLE ROW LEVEL SECURITY;

-- Now we can add the FK on renewal_requests.selected_offer_id (deferred until renewal_offers exists).
DO $$ BEGIN
  ALTER TABLE renewal_requests
    ADD CONSTRAINT renewal_requests_selected_offer_fk
    FOREIGN KEY (selected_offer_id) REFERENCES renewal_offers(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 7. INDEXES
-- ────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_policies_client_status
  ON policies(client_id, status);

-- ────────────────────────────────────────────────────────────────────────────
-- 8. RLS — recreate client-scoped policies to use auth_user_id
--          (backward compatible: also keep email match)
-- ────────────────────────────────────────────────────────────────────────────

-- Clients: read own record
CREATE POLICY "Clients can read own record" ON clients FOR SELECT
  USING (
    auth_user_id = auth.uid()
    OR email = auth.jwt() ->> 'email'
  );

-- Vehicles: read own
CREATE POLICY "Clients read own vehicles" ON vehicles FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE auth_user_id = auth.uid()
         OR email = auth.jwt() ->> 'email'
    )
  );

-- Policies: read own
CREATE POLICY "Clients read own policies" ON policies FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE auth_user_id = auth.uid()
         OR email = auth.jwt() ->> 'email'
    )
  );

-- Documents: manage own
CREATE POLICY "Clients manage own documents" ON documents FOR ALL
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE auth_user_id = auth.uid()
         OR email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients
      WHERE auth_user_id = auth.uid()
         OR email = auth.jwt() ->> 'email'
    )
  );

-- Tasks: read related
CREATE POLICY "Clients read tasks related to them" ON tasks FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE auth_user_id = auth.uid()
         OR email = auth.jwt() ->> 'email'
    )
  );

-- Reminders: read own
CREATE POLICY "Clients read own reminders" ON reminders FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE auth_user_id = auth.uid()
         OR email = auth.jwt() ->> 'email'
    )
  );

-- Renewal Requests: manage own
CREATE POLICY "Clients manage own renewal requests" ON renewal_requests FOR ALL
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE auth_user_id = auth.uid()
         OR email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients
      WHERE auth_user_id = auth.uid()
         OR email = auth.jwt() ->> 'email'
    )
  );

-- Renewal Offers: broker manages own; client reads (those on their renewal_requests)
CREATE POLICY "Brokers manage own renewal offers" ON renewal_offers FOR ALL
  USING (
    broker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    broker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Clients read own renewal offers" ON renewal_offers FOR SELECT
  USING (
    renewal_request_id IN (
      SELECT rr.id FROM renewal_requests rr
      JOIN clients c ON c.id = rr.client_id
      WHERE c.auth_user_id = auth.uid()
         OR c.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Clients respond to own renewal offers" ON renewal_offers FOR UPDATE
  USING (
    renewal_request_id IN (
      SELECT rr.id FROM renewal_requests rr
      JOIN clients c ON c.id = rr.client_id
      WHERE c.auth_user_id = auth.uid()
         OR c.email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    renewal_request_id IN (
      SELECT rr.id FROM renewal_requests rr
      JOIN clients c ON c.id = rr.client_id
      WHERE c.auth_user_id = auth.uid()
         OR c.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Admins read all renewal offers" ON renewal_offers FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Renewal Request Documents
CREATE POLICY "Brokers manage own renewal request documents" ON renewal_request_documents FOR ALL
  USING (
    renewal_request_id IN (
      SELECT id FROM renewal_requests
      WHERE broker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    renewal_request_id IN (
      SELECT id FROM renewal_requests
      WHERE broker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Clients read own renewal request documents" ON renewal_request_documents FOR SELECT
  USING (
    renewal_request_id IN (
      SELECT rr.id FROM renewal_requests rr
      JOIN clients c ON c.id = rr.client_id
      WHERE c.auth_user_id = auth.uid()
         OR c.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Clients manage own renewal request documents" ON renewal_request_documents FOR ALL
  USING (
    renewal_request_id IN (
      SELECT rr.id FROM renewal_requests rr
      JOIN clients c ON c.id = rr.client_id
      WHERE c.auth_user_id = auth.uid()
         OR c.email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    renewal_request_id IN (
      SELECT rr.id FROM renewal_requests rr
      JOIN clients c ON c.id = rr.client_id
      WHERE c.auth_user_id = auth.uid()
         OR c.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Admins read all renewal request documents" ON renewal_request_documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- ────────────────────────────────────────────────────────────────────────────
-- 9. TRIGGER — handle_new_user updated for self-registration of clients
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  _role user_role;
  _cnp  text;
  _first_name text;
  _last_name  text;
  _phone      text;
BEGIN
  _role       := COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'client'::user_role);
  _cnp        := NULLIF(NEW.raw_user_meta_data ->> 'cnp', '');
  _first_name := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'first_name', ''),
                          split_part(COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''), ' ', 1));
  _last_name  := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'last_name', ''),
                          NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''));
  _phone      := NULLIF(NEW.raw_user_meta_data ->> 'phone', '');

  -- Always create the profile.
  INSERT INTO public.profiles (user_id, full_name, email, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name',
             TRIM(COALESCE(_first_name, '') || ' ' || COALESCE(_last_name, ''))),
    COALESCE(NEW.email, ''),
    _role,
    _phone
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- If the new user is a client self-registering with a CNP, also create the
  -- clients row (unassigned to a broker — admin assigns later).
  IF _role = 'client' AND _cnp IS NOT NULL THEN
    INSERT INTO public.clients (
      broker_id, first_name, last_name, cnp, email, phone, auth_user_id
    ) VALUES (
      COALESCE(
        (NEW.raw_user_meta_data ->> 'default_broker_id')::uuid,
        (SELECT id FROM public.profiles
         WHERE role = 'broker'
         ORDER BY created_at ASC
         LIMIT 1)
      ),
      COALESCE(_first_name, '—'),
      COALESCE(_last_name, '—'),
      _cnp,
      NEW.email,
      _phone,
      NEW.id
    )
    ON CONFLICT (cnp) WHERE cnp IS NOT NULL DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger is already created in the previous migration; nothing to do here.
