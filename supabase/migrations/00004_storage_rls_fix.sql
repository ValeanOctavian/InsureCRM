-- Fix: storage.objects policies for client uploads
--
-- Symptom: clients (authenticated users with role='client' uploading from
-- the portal) get "new row violates row-level security policy" on insert
-- to the client-documents bucket.
--
-- Root cause: depending on which initial schema migration ran, the only
-- INSERT policy may be "Brokers manage own documents storage" (FOR ALL).
-- That policy requires the file's first folder to match the uploader's
-- profile id, but clients upload to a folder named with their *broker's*
-- id, not their own. So no authenticated user can insert.
--
-- Fix: drop every known storage policy on storage.objects and recreate
-- a clean, comprehensive set:
--   * INSERT  – brokers and clients can insert into their broker's folder
--   * SELECT  – broker reads own folder; client reads broker's folder;
--               admin reads all
--   * UPDATE  – broker only (own folder)
--   * DELETE  – broker only (own folder)
--
-- Idempotent: every DROP uses IF EXISTS, every CREATE uses a fresh name,
-- so re-running is safe.

-- ── Drop every known storage policy (covers all historical names) ───────
DROP POLICY IF EXISTS "Brokers manage own documents storage" ON storage.objects;
DROP POLICY IF EXISTS "Clients read documents from broker"            ON storage.objects;
DROP POLICY IF EXISTS "Admins read all documents storage"             ON storage.objects;
DROP POLICY IF EXISTS "storage_documents_insert"                      ON storage.objects;
DROP POLICY IF EXISTS "storage_documents_select_broker"               ON storage.objects;
DROP POLICY IF EXISTS "storage_documents_select_client"               ON storage.objects;
DROP POLICY IF EXISTS "storage_documents_update_broker"               ON storage.objects;
DROP POLICY IF EXISTS "storage_documents_delete_broker"               ON storage.objects;
DROP POLICY IF EXISTS "storage_documents_admin_all"                   ON storage.objects;

-- ── Ensure the bucket exists with the right config ──────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ── Helper: first folder segment must be a uuid belonging to a broker ──
-- We inline the logic into each policy so the planner can optimize and we
-- don't depend on a helper function existing.

-- ── INSERT: brokers and clients can upload into the broker's folder ────
CREATE POLICY "storage_documents_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1
      FROM profiles u
      WHERE u.user_id = auth.uid()
        AND u.role IN ('broker', 'client')
        AND (storage.foldername(name))[1] = (
          -- Brokers upload to their own folder (= their profile id).
          -- Clients upload to their broker's folder (= profiles.broker_id).
          CASE
            WHEN u.role = 'broker' THEN u.id::text
            ELSE u.broker_id::text
          END
        )
    )
  );

-- ── SELECT: brokers read own folder; clients read broker's folder ───────
CREATE POLICY "storage_documents_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1
      FROM profiles u
      WHERE u.user_id = auth.uid()
        AND (
          (u.role = 'broker' AND (storage.foldername(name))[1] = u.id::text)
          OR (u.role = 'client' AND u.broker_id IS NOT NULL
                AND (storage.foldername(name))[1] = u.broker_id::text)
        )
    )
  );

-- ── SELECT: admins read all ────────────────────────────────────────────
CREATE POLICY "storage_documents_admin_all"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ── UPDATE: brokers only, own folder ────────────────────────────────────
CREATE POLICY "storage_documents_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'broker'
        AND (storage.foldername(name))[1] = id::text
    )
  )
  WITH CHECK (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'broker'
        AND (storage.foldername(name))[1] = id::text
    )
  );

-- ── DELETE: brokers only, own folder ────────────────────────────────────
CREATE POLICY "storage_documents_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'broker'
        AND (storage.foldername(name))[1] = id::text
    )
  );
