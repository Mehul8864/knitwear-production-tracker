-- ============================================================
-- StitchOps Demo Seed Data
-- Reference date: 5 November 2026
-- ============================================================

-- NOTE: Run after creating auth users via Supabase Auth Admin or
-- the seed script (scripts/seed.ts). Auth user IDs are referenced below.
-- Demo passwords: Demo@2026! for all accounts.

-- ─── INSERT BUYERS ────────────────────────────────────────
INSERT INTO buyers (id, name, country, contact_name, contact_email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Company B', 'United Kingdom', 'James Wilson', 'james.wilson@companyb.uk'),
  ('22222222-2222-2222-2222-222222222222', 'Company C', 'Germany', 'Klaus Mueller', 'k.mueller@companyc.de');

-- ─── INSERT PRODUCTION UNITS ──────────────────────────────
INSERT INTO production_units (id, name, location, capacity_per_day) VALUES
  ('aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Unit Alpha', 'Tiruppur Main', 800),
  ('aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Unit Beta', 'Tiruppur South', 600),
  ('aaaa0003-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Unit Gamma', 'Tiruppur East', 400);

-- ─── TNA TEMPLATES ────────────────────────────────────────
INSERT INTO tna_templates (id, name) VALUES
  ('bb000001-bb00-bb00-bb00-bb0000000001', 'Standard Knitwear (9-Stage)');

INSERT INTO tna_template_milestones
  (template_id, stage, name, days_before_exfactory, sort_order) VALUES
  ('bb000001-bb00-bb00-bb00-bb0000000001', 'fabric_inhouse',   'Fabric In-house',    55, 1),
  ('bb000001-bb00-bb00-bb00-bb0000000001', 'cutting',          'Cutting Complete',   48, 2),
  ('bb000001-bb00-bb00-bb00-bb0000000001', 'stitching',        'Stitching Complete', 35, 3),
  ('bb000001-bb00-bb00-bb00-bb0000000001', 'printing',         'Printing Complete',  28, 4),
  ('bb000001-bb00-bb00-bb00-bb0000000001', 'washing',          'Washing Complete',   21, 5),
  ('bb000001-bb00-bb00-bb00-bb0000000001', 'finishing',        'Finishing Complete', 14, 6),
  ('bb000001-bb00-bb00-bb00-bb0000000001', 'packing',          'Packing Complete',    7, 7),
  ('bb000001-bb00-bb00-bb00-bb0000000001', 'final_inspection', 'Final Inspection',    3, 8),
  ('bb000001-bb00-bb00-bb00-bb0000000001', 'dispatch',         'Dispatch',            0, 9);

-- ─── ORDERS ───────────────────────────────────────────────
-- These use placeholder created_by; replace with actual merchandiser UUID after user creation.
-- The application seed script (scripts/seed.ts) sets the real UUID.

-- ORDER 1: B-PO-88213 — Company B UK — Men's crew neck tee, navy
-- Qty: 12,000 | Stage: Stitching | Completed: 6,800 | Ex-factory: 20 Nov 2026
-- Status: AMBER (production is behind required rate — 15 working days remain)
INSERT INTO orders (
  id, po_number, buyer_id, style_name, style_description,
  total_quantity, production_unit_id, current_stage,
  completed_quantity, ex_factory_date, status, risk_status,
  notes, created_by
) VALUES (
  'a0000001-0000-0000-0000-000000000001',
  'B-PO-88213',
  '11111111-1111-1111-1111-111111111111',
  'Men''s Crew Neck Tee, Navy',
  '100% cotton, 180gsm single jersey, crew neck, short sleeve',
  12000,
  'aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'stitching',
  6800,
  '2026-11-20',
  'active',
  'AMBER',
  'FOB basis. Inspection by SGS on day of dispatch.',
  '00000000-0000-0000-0000-000000000001'  -- replaced by seed script
);

-- ORDER 2: B-PO-88240 — Company B UK — Men's polo, white
-- Qty: 8,000 | Stage: Finishing | Completed: 5,200 | Ex-factory: 12 Nov 2026
-- Status: RED (only 7 days, 2,800 remaining, very tight)
INSERT INTO orders (
  id, po_number, buyer_id, style_name, style_description,
  total_quantity, production_unit_id, current_stage,
  completed_quantity, ex_factory_date, status, risk_status,
  notes, created_by
) VALUES (
  'a0000002-0000-0000-0000-000000000002',
  'B-PO-88240',
  '11111111-1111-1111-1111-111111111111',
  'Men''s Polo Shirt, White',
  '100% pique cotton, 200gsm, three-button placket, ribbed collar',
  8000,
  'aaaa0001-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'finishing',
  5200,
  '2026-11-12',
  'active',
  'RED',
  'Critical order — must not miss. UK customer compliance inspection required.',
  '00000000-0000-0000-0000-000000000001'
);

-- ORDER 3: C-PO-0488 — Company C Germany — Kids printed tee, yellow
-- Qty: 10,000 | Stage: Printing | Completed: 3,100 | Ex-factory: 28 Nov 2026
-- Status: GREEN (23 days remaining, on track)
INSERT INTO orders (
  id, po_number, buyer_id, style_name, style_description,
  total_quantity, production_unit_id, current_stage,
  completed_quantity, ex_factory_date, status, risk_status,
  notes, created_by
) VALUES (
  'a0000003-0000-0000-0000-000000000003',
  'C-PO-0488',
  '22222222-2222-2222-2222-222222222222',
  'Kids Printed Tee, Yellow',
  '100% cotton, 160gsm, children''s all-over digital print, crew neck',
  10000,
  'aaaa0002-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'printing',
  3100,
  '2026-11-28',
  'active',
  'GREEN',
  'GOTS certified fabric required. Oeko-Tex Standard 100 certificate needed.',
  '00000000-0000-0000-0000-000000000001'
);

-- ─── ORDER ITEMS (Colour/Size Matrix) ─────────────────────

-- B-PO-88213: Navy crew neck tee
INSERT INTO order_items (order_id, colour, size, quantity) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'Navy', 'XS', 500),
  ('a0000001-0000-0000-0000-000000000001', 'Navy', 'S',  1500),
  ('a0000001-0000-0000-0000-000000000001', 'Navy', 'M',  3000),
  ('a0000001-0000-0000-0000-000000000001', 'Navy', 'L',  3500),
  ('a0000001-0000-0000-0000-000000000001', 'Navy', 'XL', 2500),
  ('a0000001-0000-0000-0000-000000000001', 'Navy', 'XXL', 1000);

-- B-PO-88240: White polo
INSERT INTO order_items (order_id, colour, size, quantity) VALUES
  ('a0000002-0000-0000-0000-000000000002', 'White', 'S',   1000),
  ('a0000002-0000-0000-0000-000000000002', 'White', 'M',   2500),
  ('a0000002-0000-0000-0000-000000000002', 'White', 'L',   2500),
  ('a0000002-0000-0000-0000-000000000002', 'White', 'XL',  1500),
  ('a0000002-0000-0000-0000-000000000002', 'White', 'XXL',  500);

-- C-PO-0488: Kids yellow tee (children's sizes)
INSERT INTO order_items (order_id, colour, size, quantity) VALUES
  ('a0000003-0000-0000-0000-000000000003', 'Yellow', '2-3Y', 2000),
  ('a0000003-0000-0000-0000-000000000003', 'Yellow', '4-5Y', 2500),
  ('a0000003-0000-0000-0000-000000000003', 'Yellow', '6-7Y', 2500),
  ('a0000003-0000-0000-0000-000000000003', 'Yellow', '8-9Y', 2000),
  ('a0000003-0000-0000-0000-000000000003', 'Yellow', '10-11Y', 1000);

-- ─── ORDER MILESTONES ─────────────────────────────────────
-- B-PO-88213 milestones (ex-factory 20 Nov 2026)
INSERT INTO order_milestones
  (order_id, stage, name, target_date, completed_date, sort_order, target_quantity, completed_quantity, is_active)
VALUES
  ('a0000001-0000-0000-0000-000000000001', 'fabric_inhouse',   'Fabric In-house',    '2026-09-26', '2026-09-25', 1, 12000, 12000, false),
  ('a0000001-0000-0000-0000-000000000001', 'cutting',          'Cutting Complete',   '2026-10-03', '2026-10-04', 2, 12000, 12000, false),
  ('a0000001-0000-0000-0000-000000000001', 'stitching',        'Stitching Complete', '2026-10-16', NULL,         3, 12000, 6800,  true),
  ('a0000001-0000-0000-0000-000000000001', 'printing',         'Printing Complete',  '2026-10-23', NULL,         4, 12000, 0,     false),
  ('a0000001-0000-0000-0000-000000000001', 'washing',          'Washing Complete',   '2026-10-30', NULL,         5, 12000, 0,     false),
  ('a0000001-0000-0000-0000-000000000001', 'finishing',        'Finishing Complete', '2026-11-06', NULL,         6, 12000, 0,     false),
  ('a0000001-0000-0000-0000-000000000001', 'packing',          'Packing Complete',   '2026-11-13', NULL,         7, 12000, 0,     false),
  ('a0000001-0000-0000-0000-000000000001', 'final_inspection', 'Final Inspection',   '2026-11-17', NULL,         8, 12000, 0,     false),
  ('a0000001-0000-0000-0000-000000000001', 'dispatch',         'Dispatch',           '2026-11-20', NULL,         9, 12000, 0,     false);

-- B-PO-88240 milestones (ex-factory 12 Nov 2026)
INSERT INTO order_milestones
  (order_id, stage, name, target_date, completed_date, sort_order, target_quantity, completed_quantity, is_active)
VALUES
  ('a0000002-0000-0000-0000-000000000002', 'fabric_inhouse',   'Fabric In-house',    '2026-09-18', '2026-09-17', 1, 8000, 8000, false),
  ('a0000002-0000-0000-0000-000000000002', 'cutting',          'Cutting Complete',   '2026-09-25', '2026-09-26', 2, 8000, 8000, false),
  ('a0000002-0000-0000-0000-000000000002', 'stitching',        'Stitching Complete', '2026-10-08', '2026-10-09', 3, 8000, 8000, false),
  ('a0000002-0000-0000-0000-000000000002', 'printing',         'Printing Complete',  '2026-10-15', '2026-10-16', 4, 8000, 8000, false),
  ('a0000002-0000-0000-0000-000000000002', 'washing',          'Washing Complete',   '2026-10-22', '2026-10-22', 5, 8000, 8000, false),
  ('a0000002-0000-0000-0000-000000000002', 'finishing',        'Finishing Complete', '2026-10-29', NULL,         6, 8000, 5200, true),
  ('a0000002-0000-0000-0000-000000000002', 'packing',          'Packing Complete',   '2026-11-05', NULL,         7, 8000, 0,    false),
  ('a0000002-0000-0000-0000-000000000002', 'final_inspection', 'Final Inspection',   '2026-11-09', NULL,         8, 8000, 0,    false),
  ('a0000002-0000-0000-0000-000000000002', 'dispatch',         'Dispatch',           '2026-11-12', NULL,         9, 8000, 0,    false);

-- C-PO-0488 milestones (ex-factory 28 Nov 2026)
INSERT INTO order_milestones
  (order_id, stage, name, target_date, completed_date, sort_order, target_quantity, completed_quantity, is_active)
VALUES
  ('a0000003-0000-0000-0000-000000000003', 'fabric_inhouse',   'Fabric In-house',    '2026-10-04', '2026-10-03', 1, 10000, 10000, false),
  ('a0000003-0000-0000-0000-000000000003', 'cutting',          'Cutting Complete',   '2026-10-11', '2026-10-12', 2, 10000, 10000, false),
  ('a0000003-0000-0000-0000-000000000003', 'stitching',        'Stitching Complete', '2026-10-24', '2026-10-25', 3, 10000, 10000, false),
  ('a0000003-0000-0000-0000-000000000003', 'printing',         'Printing Complete',  '2026-10-31', NULL,         4, 10000, 3100,  true),
  ('a0000003-0000-0000-0000-000000000003', 'washing',          'Washing Complete',   '2026-11-07', NULL,         5, 10000, 0,     false),
  ('a0000003-0000-0000-0000-000000000003', 'finishing',        'Finishing Complete', '2026-11-14', NULL,         6, 10000, 0,     false),
  ('a0000003-0000-0000-0000-000000000003', 'packing',          'Packing Complete',   '2026-11-21', NULL,         7, 10000, 0,     false),
  ('a0000003-0000-0000-0000-000000000003', 'final_inspection', 'Final Inspection',   '2026-11-25', NULL,         8, 10000, 0,     false),
  ('a0000003-0000-0000-0000-000000000003', 'dispatch',         'Dispatch',           '2026-11-28', NULL,         9, 10000, 0,     false);

-- ─── PRODUCTION UPDATES (7-day history) ───────────────────
-- These are inserted by the seed script with real supervisor UUIDs.
-- Shown here as documentation of the data model.
-- See scripts/seed.ts for the actual INSERT with auth.uid() references.
