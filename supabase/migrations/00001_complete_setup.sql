-- ============================================================================
-- InsureCRM — COMPLETE DATABASE SETUP (safe to run multiple times)
-- ============================================================================
-- Drop existing policies first so we can recreate fresh
-- Then creates all types, tables, indexes, triggers, RLS, and storage.
-- ============================================================================

-- ────────────────────────────────────────────────────────────
-- 0. CLEAN UP existing RLS policies (so we can recreate them)
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
  DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
  DROP POLICY IF EXISTS "Brokers can read own and client profiles" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
  DROP POLICY IF EXISTS "Brokers manage own clients" ON clients;
  DROP POLICY IF EXISTS "Clients can read own record" ON clients;
  DROP POLICY IF EXISTS "Admins read all clients" ON clients;
  DROP POLICY IF EXISTS "Brokers manage own vehicles" ON vehicles;
  DROP POLICY IF EXISTS "Clients read own vehicles" ON vehicles;
  DROP POLICY IF EXISTS "Admins read all vehicles" ON vehicles;
  DROP POLICY IF EXISTS "Brokers manage own policies" ON policies;
  DROP POLICY IF EXISTS "Clients read own policies" ON policies;
  DROP POLICY IF EXISTS "Admins read all policies" ON policies;
  DROP POLICY IF EXISTS "Brokers manage own documents" ON documents;
  DROP POLICY IF EXISTS "Clients manage own documents" ON documents;
  DROP POLICY IF EXISTS "Admins read all documents" ON documents;
  DROP POLICY IF EXISTS "Brokers manage own tasks" ON tasks;
  DROP POLICY IF EXISTS "Clients read tasks related to them" ON tasks;
  DROP POLICY IF EXISTS "Admins read all tasks" ON tasks;
  DROP POLICY IF EXISTS "Brokers manage own reminders" ON reminders;
  DROP POLICY IF EXISTS "Clients read own reminders" ON reminders;
  DROP POLICY IF EXISTS "Admins read all reminders" ON reminders;
  DROP POLICY IF EXISTS "Brokers manage renewal requests for own clients" ON renewal_requests;
  DROP POLICY IF EXISTS "Clients manage own renewal requests" ON renewal_requests;
  DROP POLICY IF EXISTS "Admins read all renewal requests" ON renewal_requests;
  DROP POLICY IF EXISTS "Brokers manage own documents storage" ON storage.objects;
  DROP POLICY IF EXISTS "Clients read documents from broker" ON storage.objects;
  DROP POLICY IF EXISTS "Admins read all documents storage" ON storage.objects;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────
-- 1. ENUMS (skip if already exist)
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin', 'broker', 'client'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE client_status AS ENUM ('active', 'inactive', 'lead'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE policy_type AS ENUM ('RCA', 'CASCO', 'HOME', 'TRAVEL', 'HEALTH', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE policy_status AS ENUM ('active', 'expiring_soon', 'expired', 'renewed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE document_type AS ENUM ('identity_card', 'car_registration', 'car_identity_book', 'address_certificate', 'policy', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE quality_status AS ENUM ('pending', 'clear', 'blurry', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ocr_status AS ENUM ('pending', 'processing', 'completed', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE reminder_channel AS ENUM ('email', 'sms', 'whatsapp'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE reminder_status AS ENUM ('pending', 'sent', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE renewal_request_status AS ENUM ('requested', 'documents_needed', 'in_progress', 'issued', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('unpaid', 'paid', 'not_required'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- 2. TABLES
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  email       text NOT NULL,
  phone       text,
  role        user_role NOT NULL DEFAULT 'client',
  broker_id   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  first_name  text NOT NULL,
  last_name   text NOT NULL,
  cnp         text,
  email       text,
  phone       text,
  address     text,
  city        text,
  county      text,
  status      client_status NOT NULL DEFAULT 'active',
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  broker_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  registration_number text NOT NULL,
  vin                 text,
  brand               text NOT NULL,
  model               text NOT NULL,
  year                smallint NOT NULL,
  engine_capacity     smallint,
  fuel_type           text,
  document_number     text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS policies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  vehicle_id      uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  broker_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            policy_type NOT NULL DEFAULT 'OTHER',
  insurer_name    text NOT NULL,
  policy_number   text NOT NULL,
  start_date      date NOT NULL,
  end_date        date NOT NULL,
  premium_amount  numeric(12,2) NOT NULL,
  status          policy_status NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  vehicle_id      uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  broker_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            document_type NOT NULL DEFAULT 'other',
  file_url        text NOT NULL,
  quality_status  quality_status NOT NULL DEFAULT 'pending',
  ocr_status      ocr_status NOT NULL DEFAULT 'pending',
  extracted_data  jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id   uuid REFERENCES clients(id) ON DELETE SET NULL,
  policy_id   uuid REFERENCES policies(id) ON DELETE SET NULL,
  title       text NOT NULL,
  description text,
  status      task_status NOT NULL DEFAULT 'todo',
  priority    task_priority NOT NULL DEFAULT 'medium',
  due_date    timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reminders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id     uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  policy_id     uuid NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  channel       reminder_channel NOT NULL DEFAULT 'email',
  scheduled_for date NOT NULL,
  sent_at       timestamptz,
  status        reminder_status NOT NULL DEFAULT 'pending',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS renewal_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  broker_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  policy_id       uuid NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  status          renewal_request_status NOT NULL DEFAULT 'requested',
  payment_status  payment_status NOT NULL DEFAULT 'not_required',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id   uuid NOT NULL,
  action      text NOT NULL,
  description text NOT NULL,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 3. INDEXES
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_broker_id ON profiles(broker_id);

CREATE INDEX IF NOT EXISTS idx_clients_broker_id ON clients(broker_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(last_name, first_name);

CREATE INDEX IF NOT EXISTS idx_vehicles_client_id ON vehicles(client_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_broker_id ON vehicles(broker_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration_number);

CREATE INDEX IF NOT EXISTS idx_policies_client_id ON policies(client_id);
CREATE INDEX IF NOT EXISTS idx_policies_broker_id ON policies(broker_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
CREATE INDEX IF NOT EXISTS idx_policies_end_date ON policies(end_date);

CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_broker_id ON documents(broker_id);
CREATE INDEX IF NOT EXISTS idx_documents_quality ON documents(quality_status);
CREATE INDEX IF NOT EXISTS idx_documents_ocr ON documents(ocr_status);

CREATE INDEX IF NOT EXISTS idx_tasks_broker_id ON tasks(broker_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

CREATE INDEX IF NOT EXISTS idx_reminders_broker_id ON reminders(broker_id);
CREATE INDEX IF NOT EXISTS idx_reminders_policy_id ON reminders(policy_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);

CREATE INDEX IF NOT EXISTS idx_renewal_requests_broker_id ON renewal_requests(broker_id);
CREATE INDEX IF NOT EXISTS idx_renewal_requests_client_id ON renewal_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_renewal_requests_policy_id ON renewal_requests(policy_id);
CREATE INDEX IF NOT EXISTS idx_renewal_requests_status ON renewal_requests(status);

CREATE INDEX IF NOT EXISTS idx_activity_logs_broker_id ON activity_logs(broker_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_id, entity_type);

-- ────────────────────────────────────────────────────────────
-- 4. TRIGGER: Auto-create profile on user signup
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  _role user_role;
BEGIN
  _role := COALESCE(
    (NEW.raw_user_meta_data ->> 'role')::user_role,
    'client'::user_role
  );

  INSERT INTO public.profiles (user_id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.email, ''),
    _role
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 5. TRIGGER: Auto-update updated_at timestamp
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_policies_updated_at
  BEFORE UPDATE ON policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_renewal_requests_updated_at
  BEFORE UPDATE ON renewal_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_activity_logs_updated_at
  BEFORE UPDATE ON activity_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Clients
CREATE POLICY "Brokers manage own clients" ON clients FOR ALL USING (broker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (broker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Clients can read own record" ON clients FOR SELECT USING (email = auth.jwt() ->> 'email');
CREATE POLICY "Admins read all clients" ON clients FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Vehicles
CREATE POLICY "Brokers manage own vehicles" ON vehicles FOR ALL USING (broker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (broker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Clients read own vehicles" ON vehicles FOR SELECT USING (client_id IN (SELECT id FROM clients WHERE email = auth.jwt() ->> 'email'));
CREATE POLICY "Admins read all vehicles" ON vehicles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Policies
CREATE POLICY "Brokers manage own policies" ON policies FOR ALL USING (broker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (broker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Clients read own policies" ON policies FOR SELECT USING (client_id IN (SELECT id FROM clients WHERE email = auth.jwt() ->> 'email'));
CREATE POLICY "Admins read all policies" ON policies FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Documents
CREATE POLICY "Brokers manage own documents" ON documents FOR ALL USING (broker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (broker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Clients manage own documents" ON documents FOR ALL USING (client_id IN (SELECT id FROM clients WHERE email = auth.jwt() ->> 'email')) WITH CHECK (client_id IN (SELECT id FROM clients WHERE email = auth.jwt() ->> 'email'));
CREATE POLICY "Admins read all documents" ON documents FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Tasks
CREATE POLICY "Brokers manage own tasks" ON tasks FOR ALL USING (broker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (broker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Clients read tasks related to them" ON tasks FOR SELECT USING (client_id IN (SELECT id FROM clients WHERE email = auth.jwt() ->> 'email'));
CREATE POLICY "Admins read all tasks" ON tasks FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Reminders
CREATE POLICY "Brokers manage own reminders" ON reminders FOR ALL USING (broker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (broker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Clients read own reminders" ON reminders FOR SELECT USING (client_id IN (SELECT id FROM clients WHERE email = auth.jwt() ->> 'email'));
CREATE POLICY "Admins read all reminders" ON reminders FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Renewal Requests
CREATE POLICY "Brokers manage renewal requests for own clients" ON renewal_requests FOR ALL USING (broker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (broker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Clients manage own renewal requests" ON renewal_requests FOR ALL USING (client_id IN (SELECT id FROM clients WHERE email = auth.jwt() ->> 'email')) WITH CHECK (client_id IN (SELECT id FROM clients WHERE email = auth.jwt() ->> 'email'));
CREATE POLICY "Admins read all renewal requests" ON renewal_requests FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Activity Logs
CREATE POLICY "Brokers manage own activity_logs" ON activity_logs FOR ALL USING (broker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (broker_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- ────────────────────────────────────────────────────────────
-- 7. STORAGE BUCKETS
-- ────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Brokers manage own documents storage" ON storage.objects FOR ALL
  USING (bucket_id = 'client-documents' AND (storage.foldername(name))[1] = (SELECT id::text FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (bucket_id = 'client-documents' AND (storage.foldername(name))[1] = (SELECT id::text FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Clients read documents from broker" ON storage.objects FOR SELECT
  USING (bucket_id = 'client-documents' AND EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.broker_id IS NOT NULL AND (storage.foldername(name))[1] = p.broker_id::text));

CREATE POLICY "Admins read all documents storage" ON storage.objects FOR SELECT
  USING (bucket_id = 'client-documents' AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
