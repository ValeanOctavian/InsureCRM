-- ─────────────────────────────────────────────────────────────
-- SEED DATA — InsureCRM Demo
--
-- Creates:
--   demo broker account (broker@insurecrm.com / Demo123!)
--   demo client account  (client@insurecrm.com / Demo123!)
--   6 realistic clients with vehicles & policies
--   documents, tasks, reminders, renewal requests, activities
-- ─────────────────────────────────────────────────────────────

-- ─── 1. Create auth users via the Supabase auth API ───
-- These are created by the seed API route (src/app/api/seed/route.ts)
-- using the admin client. The SQL below creates the profile records.

-- ─── 2. Profiles ───

INSERT INTO profiles (id, user_id, full_name, email, phone, role, broker_id) VALUES
  ('00000000-0000-0000-0000-000000000001', 'auth-user-broker-1', 'Andrei Popescu', 'broker@insurecrm.com', '+40 721 123 456', 'broker', NULL),
  ('00000000-0000-0000-0000-000000000002', 'auth-user-client-1', 'Maria Ionescu', 'client@insurecrm.com', '+40 722 987 654', 'client', '00000000-0000-0000-0000-000000000001');

-- ─── 3. Clients (6 realistic clients) ───

INSERT INTO clients (id, broker_id, first_name, last_name, cnp, email, phone, address, city, county, status) VALUES
  ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Maria', 'Ionescu', '2890112345678', 'client@insurecrm.com', '+40 722 987 654', 'Str. Mihai Viteazu 12', 'București', 'Ilfov', 'active'),
  ('c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Ion', 'Popescu', '1850612345679', 'ion.popescu@email.ro', '+40 723 456 789', 'Str. Libertății 45', 'Cluj-Napoca', 'Cluj', 'active'),
  ('c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Elena', 'Dumitru', '2900312345680', 'elena.dumitru@email.ro', '+40 724 567 890', 'Bd. Unirii 78', 'Iași', 'Iași', 'active'),
  ('c0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Alexandru', 'Stan', '1870812345681', 'alex.stan@email.ro', '+40 725 678 901', 'Str. Primăverii 23', 'Timișoara', 'Timiș', 'active'),
  ('c0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Cristina', 'Mihai', '2920512345682', 'cristina.mihai@email.ro', '+40 726 789 012', 'Aleea Constructorilor 5', 'Brașov', 'Brașov', 'active'),
  ('c0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Doru', 'Gheorghiu', '1830312345683', 'doru.gheorghiu@email.ro', '+40 727 890 123', 'Str. Republicii 34', 'Constanța', 'Constanța', 'active');

-- ─── 4. Vehicles ───

INSERT INTO vehicles (id, client_id, broker_id, registration_number, vin, brand, model, year, engine_capacity, fuel_type) VALUES
  ('v0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'B-123-ABC', 'WBA3A5C50DF123456', 'BMW', 'X3', 2022, 1998, 'Diesel'),
  ('v0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'CJ-45-ABC', 'U5YPC8135GL654321', 'Dacia', 'Logan', 2021, 1598, 'Petrol'),
  ('v0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'CJ-46-ABC', 'VF1DA000035123456', 'Renault', 'Megane', 2023, 1461, 'Diesel'),
  ('v0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'IS-78-BCD', 'W0L0AHL4851234567', 'Opel', 'Astra', 2020, 1598, 'Petrol'),
  ('v0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'TM-12-XYZ', 'TMBJK7NPXK1234567', 'Škoda', 'Octavia', 2023, 1968, 'Diesel'),
  ('v0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'BV-90-DEF', 'JTDKW3D3X01234567', 'Toyota', 'Corolla', 2022, 1798, 'Hybrid'),
  ('v0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'CT-56-GHI', 'UU1DG8JH5K1234567', 'Volkswagen', 'Passat', 2021, 1968, 'Diesel');

-- ─── 5. Policies (mix of active, expiring_soon, expired, renewed) ───

-- Helper: use dates relative to today
-- CURRENT_DATE is today

INSERT INTO policies (id, client_id, vehicle_id, broker_id, type, insurer_name, policy_number, start_date, end_date, premium_amount, status) VALUES
  -- Maria Ionescu — RCA expiring in 5 days (demo scenario)
  ('p0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'v0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'RCA', 'Euroins', 'RCA-2024-001234', CURRENT_DATE - 365, CURRENT_DATE + 5, 1250.00, 'expiring_soon'),

  -- Maria Ionescu — CASCO active
  ('p0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'v0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'CASCO', 'Allianz-Țiriac', 'CASCO-2024-005678', CURRENT_DATE - 180, CURRENT_DATE + 185, 3200.00, 'expiring_soon'),

  -- Ion Popescu — RCA active (Logan)
  ('p0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'v0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'RCA', 'Groupama', 'RCA-2024-002345', CURRENT_DATE - 300, CURRENT_DATE + 65, 980.00, 'active'),

  -- Ion Popescu — CASCO active (Megane)
  ('p0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', 'v0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'CASCO', 'Allianz-Țiriac', 'CASCO-2023-009876', CURRENT_DATE - 400, CURRENT_DATE + 320, 2800.00, 'active'),

  -- Elena Dumitru — RCA expired
  ('p0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000003', 'v0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'RCA', 'Omniasig', 'RCA-2023-003456', CURRENT_DATE - 730, CURRENT_DATE - 30, 1100.00, 'expired'),

  -- Alexandru Stan — RCA expiring in 1 day
  ('p0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000004', 'v0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'RCA', 'Euroins', 'RCA-2024-004567', CURRENT_DATE - 364, CURRENT_DATE + 1, 1350.00, 'expiring_soon'),

  -- Cristina Mihai — RCA active, HOME active
  ('p0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000005', 'v0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'RCA', 'Groupama', 'RCA-2024-005678', CURRENT_DATE - 200, CURRENT_DATE + 165, 1050.00, 'active'),
  ('p0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000005', NULL, '00000000-0000-0000-0000-000000000001', 'HOME', 'Generali', 'HOME-2024-001234', CURRENT_DATE - 90, CURRENT_DATE + 275, 850.00, 'active'),

  -- Doru Gheorghiu — RCA expiring in 14 days
  ('p0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000006', 'v0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'RCA', 'Omniasig', 'RCA-2024-006789', CURRENT_DATE - 351, CURRENT_DATE + 14, 1180.00, 'expiring_soon'),

  -- Doru Gheorghiu — Travel policy active
  ('p0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000006', NULL, '00000000-0000-0000-0000-000000000001', 'TRAVEL', 'Allianz-Țiriac', 'TRAVEL-2024-000567', CURRENT_DATE - 60, CURRENT_DATE + 305, 350.00, 'active');

-- ─── 6. Documents (sample records) ───

INSERT INTO documents (id, client_id, broker_id, type, file_url, quality_status, ocr_status, created_at) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'identity_card', 'https://placehold.co/400x300/E2E8F0/64748B?text=CI+Maria', 'clear', 'completed', CURRENT_DATE - 10),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'identity_card', 'https://placehold.co/400x300/E2E8F0/64748B?text=CI+Ion', 'clear', 'completed', CURRENT_DATE - 20),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'car_registration', 'https://placehold.co/400x300/E2E8F0/64748B?text=Car+Reg+Ion', 'clear', 'completed', CURRENT_DATE - 15),
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'identity_card', 'https://placehold.co/400x300/FEE2E2/EF4444?text=CI+Elena+Blurry', 'blurry', 'failed', CURRENT_DATE - 5),
  ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'identity_card', 'https://placehold.co/400x300/E2E8F0/64748B?text=CI+Alex', 'clear', 'completed', CURRENT_DATE - 3);

-- ─── 7. Tasks ───

INSERT INTO tasks (id, broker_id, client_id, policy_id, title, description, priority, status, due_date, created_at) VALUES
  ('t0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'p0000000-0000-0000-0000-000000000006', 'Renew RCA for Alexandru Stan', 'Policy RCA-2024-004567 expires tomorrow. Contact client urgently.', 'high', 'todo', CURRENT_DATE, CURRENT_DATE - 3),
  ('t0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001', 'Review renewal request for Maria Ionescu', 'Client has requested renewal of RCA policy. Review and process.', 'medium', 'todo', CURRENT_DATE + 2, CURRENT_DATE - 2),
  ('t0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', NULL, 'Call Elena Dumitru about expired policy', 'Elena has an expired RCA policy and needs a new quote.', 'medium', 'in_progress', CURRENT_DATE, CURRENT_DATE - 1),
  ('t0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', NULL, 'Review blurry document from Elena Dumitru', 'Identity card upload is blurry. Request a new photo.', 'low', 'todo', CURRENT_DATE + 5, CURRENT_DATE - 1),
  ('t0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 'p0000000-0000-0000-0000-000000000009', 'Send renewal reminder to Doru Gheorghiu', 'RCA policy expiring in 14 days. Send reminder via portal.', 'medium', 'todo', CURRENT_DATE + 7, CURRENT_DATE);

-- ─── 8. Renewal Requests ───

INSERT INTO renewal_requests (id, client_id, broker_id, policy_id, status, payment_status, created_at) VALUES
  ('r0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001', 'requested', 'not_required', CURRENT_DATE - 2),
  ('r0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000006', 'requested', 'not_required', CURRENT_DATE - 1);

-- ─── 9. Reminders (sent today for demo) ───

INSERT INTO reminders (id, broker_id, client_id, policy_id, channel, scheduled_for, sent_at, status, created_at) VALUES
  ('rem-00000001', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001', 'email', CURRENT_DATE, CURRENT_DATE, 'sent', CURRENT_DATE),
  ('rem-00000002', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'p0000000-0000-0000-0000-000000000006', 'email', CURRENT_DATE, NULL, 'pending', CURRENT_DATE);

-- ─── 10. Activity Log ───

INSERT INTO activity_logs (id, broker_id, entity_type, entity_id, action, description, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'client', 'c0000000-0000-0000-0000-000000000001', 'created', 'Client Maria Ionescu was created', CURRENT_DATE - 10),
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'document', 'd0000000-0000-0000-0000-000000000001', 'uploaded', 'Identity card document uploaded for Maria Ionescu', CURRENT_DATE - 10),
  ('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'document', 'd0000000-0000-0000-0000-000000000001', 'checked', 'OCR completed for identity card document', CURRENT_DATE - 9),
  ('a0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'client', 'c0000000-0000-0000-0000-000000000002', 'created', 'Client Ion Popescu was created', CURRENT_DATE - 20),
  ('a0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'document', 'd0000000-0000-0000-0000-000000000003', 'uploaded', 'Car registration document uploaded for Ion Popescu', CURRENT_DATE - 15),
  ('a0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'reminder', 'rem-00000001', 'sent', 'Renewal reminder sent to Maria Ionescu for RCA policy', CURRENT_DATE),
  ('a0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'renewal_request', 'p0000000-0000-0000-0000-000000000001', 'requested', 'Renewal request created for RCA-2024-001234', CURRENT_DATE - 2),
  ('a0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'task', 't0000000-0000-0000-0000-000000000002', 'completed', 'Task Review renewal request for Maria Ionescu marked as done', CURRENT_DATE - 1),
  ('a0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'client', 'c0000000-0000-0000-0000-000000000005', 'created', 'Client Cristina Mihai was created', CURRENT_DATE - 30),
  ('a0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'policy', 'p0000000-0000-0000-0000-000000000003', 'renewed', 'RCA policy RCA-2024-002345 renewed for Ion Popescu', CURRENT_DATE - 60);
