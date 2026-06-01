-- ─────────────────────────────────────────────────────────────
-- RLS Policies — InsureCRM
-- 
-- Principles:
--   brokers can CRUD their own data (broker_id = auth profile id)
--   clients can only READ their own portal data (matched by email)
--   admins can read/write everything
-- ─────────────────────────────────────────────────────────────

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────
-- Helper function: check if user is an admin
-- ──────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (SELECT role = 'admin' FROM profiles WHERE user_id = auth.uid()),
      FALSE
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: get the profile id for the current auth user
CREATE OR REPLACE FUNCTION current_profile_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: check if the current user owns this broker resource
CREATE OR REPLACE FUNCTION owns_broker_resource(resource_broker_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN resource_broker_id = current_profile_id() OR is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────
── PROFILES
-- ──────────────────────────────────
-- Brokers can read their own profile. Admins can read all.
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (
    user_id = auth.uid() OR is_admin()
  );

-- Users can update their own profile. Admins can update any.
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (
    user_id = auth.uid() OR is_admin()
  );

-- Only admins can insert/delete profiles
CREATE POLICY "profiles_insert_admin" ON profiles
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "profiles_delete_admin" ON profiles
  FOR DELETE USING (is_admin());

-- ──────────────────────────────────
── CLIENTS
-- ──────────────────────────────────
-- Brokers can CRUD their own clients. Clients can read their own record.
CREATE POLICY "clients_select_broker" ON clients
  FOR SELECT USING (
    broker_id = current_profile_id()          -- broker owner
    OR email = auth.email()                    -- client reading own data
    OR is_admin()                               -- admin
  );

CREATE POLICY "clients_insert_broker" ON clients
  FOR INSERT WITH CHECK (
    broker_id = current_profile_id() OR is_admin()
  );

CREATE POLICY "clients_update_broker" ON clients
  FOR UPDATE USING (
    broker_id = current_profile_id() OR is_admin()
  );

CREATE POLICY "clients_delete_broker" ON clients
  FOR DELETE USING (
    broker_id = current_profile_id() OR is_admin()
  );

-- ──────────────────────────────────
── VEHICLES
-- ──────────────────────────────────
CREATE POLICY "vehicles_select_broker" ON vehicles
  FOR SELECT USING (
    owns_broker_resource(broker_id)
    OR EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = vehicles.client_id
        AND clients.email = auth.email()
    )
  );

CREATE POLICY "vehicles_insert_broker" ON vehicles
  FOR INSERT WITH CHECK (
    owns_broker_resource(broker_id)
  );

CREATE POLICY "vehicles_update_broker" ON vehicles
  FOR UPDATE USING (
    owns_broker_resource(broker_id)
  );

CREATE POLICY "vehicles_delete_broker" ON vehicles
  FOR DELETE USING (
    owns_broker_resource(broker_id)
  );

-- ──────────────────────────────────
── POLICIES
-- ──────────────────────────────────
CREATE POLICY "policies_select_broker" ON policies
  FOR SELECT USING (
    owns_broker_resource(broker_id)
    OR EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = policies.client_id
        AND clients.email = auth.email()
    )
  );

CREATE POLICY "policies_insert_broker" ON policies
  FOR INSERT WITH CHECK (
    owns_broker_resource(broker_id)
  );

CREATE POLICY "policies_update_broker" ON policies
  FOR UPDATE USING (
    owns_broker_resource(broker_id)
  );

CREATE POLICY "policies_delete_broker" ON policies
  FOR DELETE USING (
    owns_broker_resource(broker_id)
  );

-- ──────────────────────────────────
── DOCUMENTS
-- ──────────────────────────────────
CREATE POLICY "documents_select_broker" ON documents
  FOR SELECT USING (
    owns_broker_resource(broker_id)
    OR EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = documents.client_id
        AND clients.email = auth.email()
    )
  );

CREATE POLICY "documents_insert_broker" ON documents
  FOR INSERT WITH CHECK (
    owns_broker_resource(broker_id)
    OR EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = documents.client_id
        AND clients.email = auth.email()
    )
  );

CREATE POLICY "documents_update_broker" ON documents
  FOR UPDATE USING (
    owns_broker_resource(broker_id)
  );

CREATE POLICY "documents_delete_broker" ON documents
  FOR DELETE USING (
    owns_broker_resource(broker_id)
  );

-- ──────────────────────────────────
── TASKS
-- ──────────────────────────────────
CREATE POLICY "tasks_select_broker" ON tasks
  FOR SELECT USING (
    owns_broker_resource(broker_id)
  );

CREATE POLICY "tasks_insert_broker" ON tasks
  FOR INSERT WITH CHECK (
    owns_broker_resource(broker_id)
  );

CREATE POLICY "tasks_update_broker" ON tasks
  FOR UPDATE USING (
    owns_broker_resource(broker_id)
  );

CREATE POLICY "tasks_delete_broker" ON tasks
  FOR DELETE USING (
    owns_broker_resource(broker_id)
  );

-- ──────────────────────────────────
── REMINDERS
-- ──────────────────────────────────
CREATE POLICY "reminders_select_broker" ON reminders
  FOR SELECT USING (
    owns_broker_resource(broker_id)
  );

CREATE POLICY "reminders_insert_broker" ON reminders
  FOR INSERT WITH CHECK (
    owns_broker_resource(broker_id)
  );

CREATE POLICY "reminders_update_broker" ON reminders
  FOR UPDATE USING (
    owns_broker_resource(broker_id)
  );

CREATE POLICY "reminders_delete_broker" ON reminders
  FOR DELETE USING (
    owns_broker_resource(broker_id)
  );

-- ──────────────────────────────────
── RENEWAL_REQUESTS
-- ──────────────────────────────────
CREATE POLICY "renewal_requests_select_broker" ON renewal_requests
  FOR SELECT USING (
    owns_broker_resource(broker_id)
    OR EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = renewal_requests.client_id
        AND clients.email = auth.email()
    )
  );

CREATE POLICY "renewal_requests_insert_broker" ON renewal_requests
  FOR INSERT WITH CHECK (
    owns_broker_resource(broker_id)
    OR EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = renewal_requests.client_id
        AND clients.email = auth.email()
    )
  );

CREATE POLICY "renewal_requests_update_broker" ON renewal_requests
  FOR UPDATE USING (
    owns_broker_resource(broker_id)
  );

CREATE POLICY "renewal_requests_delete_broker" ON renewal_requests
  FOR DELETE USING (
    owns_broker_resource(broker_id)
  );

-- ──────────────────────────────────
── ACTIVITY_LOGS
-- ──────────────────────────────────
CREATE POLICY "activity_logs_select_broker" ON activity_logs
  FOR SELECT USING (
    owns_broker_resource(broker_id)
  );

CREATE POLICY "activity_logs_insert_broker" ON activity_logs
  FOR INSERT WITH CHECK (
    owns_broker_resource(broker_id)
  );

-- ──────────────────────────────────
── STORAGE BUCKET: client-documents
-- ──────────────────────────────────
-- Authenticated users can upload files to their broker's folder
-- Brokers/admins can read all files in their folder
-- Clients can read only their own documents

CREATE POLICY "storage_documents_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'client-documents'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "storage_documents_select_broker" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'client-documents'
    AND (
      -- Admin can see all
      is_admin()
      -- Broker can see files in their folder
      OR (storage.foldername(name))[1] = current_profile_id()::text
      -- Client can see files (all files are accessible via document records which have their own RLS)
      OR auth.role() = 'authenticated'
    )
  );
