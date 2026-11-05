-- ============================================================
-- StitchOps Initial Schema Migration
-- ============================================================

-- gen_random_uuid() is built into PostgreSQL 13+ (Supabase uses PG 15+)
-- No extension needed — uuid-ossp was only required for uuid_generate_v4()

-- ─── PROFILES ─────────────────────────────────────────────
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('merchandiser', 'supervisor', 'buyer')),
  production_unit_id UUID,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── BUYERS ───────────────────────────────────────────────
CREATE TABLE buyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PRODUCTION UNITS ─────────────────────────────────────
CREATE TABLE production_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  capacity_per_day INTEGER NOT NULL DEFAULT 500,
  supervisor_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from profiles to production_units
ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_unit
  FOREIGN KEY (production_unit_id)
  REFERENCES production_units(id);

-- ─── ORDERS ───────────────────────────────────────────────
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT NOT NULL UNIQUE,
  buyer_id UUID NOT NULL REFERENCES buyers(id),
  style_name TEXT NOT NULL,
  style_description TEXT,
  total_quantity INTEGER NOT NULL CHECK (total_quantity > 0),
  production_unit_id UUID NOT NULL REFERENCES production_units(id),
  current_stage TEXT NOT NULL DEFAULT 'fabric_inhouse'
    CHECK (current_stage IN (
      'fabric_inhouse','cutting','stitching','printing',
      'washing','finishing','packing','final_inspection','dispatch'
    )),
  completed_quantity INTEGER NOT NULL DEFAULT 0 CHECK (completed_quantity >= 0),
  ex_factory_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','completed','cancelled','on_hold')),
  risk_status TEXT NOT NULL DEFAULT 'GREEN'
    CHECK (risk_status IN ('GREEN','AMBER','RED')),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_unit ON orders(production_unit_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_exfactory ON orders(ex_factory_date);
CREATE INDEX idx_orders_risk ON orders(risk_status);

-- ─── ORDER ITEMS (colour/size matrix) ─────────────────────
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  colour TEXT NOT NULL,
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE INDEX idx_items_order ON order_items(order_id);

-- ─── TNA TEMPLATES ────────────────────────────────────────
CREATE TABLE tna_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tna_template_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES tna_templates(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  name TEXT NOT NULL,
  days_before_exfactory INTEGER NOT NULL CHECK (days_before_exfactory >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ─── ORDER MILESTONES ─────────────────────────────────────
CREATE TABLE order_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  name TEXT NOT NULL,
  target_date DATE NOT NULL,
  completed_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  target_quantity INTEGER NOT NULL DEFAULT 0,
  completed_quantity INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_milestones_order ON order_milestones(order_id);
CREATE INDEX idx_milestones_stage ON order_milestones(stage);

-- ─── MILESTONE DATE CHANGE HISTORY ────────────────────────
CREATE TABLE milestone_date_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES order_milestones(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  previous_date DATE NOT NULL,
  new_date DATE NOT NULL,
  reason TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES profiles(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_date_history_order ON milestone_date_change_history(order_id);
CREATE INDEX idx_date_history_milestone ON milestone_date_change_history(milestone_id);

-- ─── PRODUCTION UPDATES ───────────────────────────────────
CREATE TABLE production_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE,  -- for idempotent offline sync
  order_id UUID NOT NULL REFERENCES orders(id),
  milestone_id UUID REFERENCES order_milestones(id),
  supervisor_id UUID NOT NULL REFERENCES profiles(id),
  stage TEXT NOT NULL,
  quantity_completed INTEGER NOT NULL CHECK (quantity_completed > 0),
  update_date DATE NOT NULL,
  issue_note_original TEXT,
  issue_note_english TEXT,
  ai_category TEXT,
  ai_confidence NUMERIC(4,3),
  ai_needs_review BOOLEAN NOT NULL DEFAULT FALSE,
  ai_corrected_category TEXT,
  ai_corrected_by UUID REFERENCES profiles(id),
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_updates_order ON production_updates(order_id);
CREATE INDEX idx_updates_supervisor ON production_updates(supervisor_id);
CREATE INDEX idx_updates_date ON production_updates(update_date);
CREATE INDEX idx_updates_review ON production_updates(ai_needs_review) WHERE ai_needs_review = TRUE;

-- ─── AI CLASSIFICATIONS ───────────────────────────────────
CREATE TABLE ai_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  original_note TEXT NOT NULL,
  english_translation TEXT NOT NULL,
  reason_category TEXT NOT NULL,
  confidence NUMERIC(4,3),
  needs_review BOOLEAN NOT NULL DEFAULT FALSE,
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── BUYER ACCESS TOKENS ──────────────────────────────────
CREATE TABLE buyer_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES buyers(id),
  token_hash TEXT NOT NULL UNIQUE,  -- only SHA-256 hash stored, never plain token
  label TEXT,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tokens_hash ON buyer_access_tokens(token_hash);
CREATE INDEX idx_tokens_buyer ON buyer_access_tokens(buyer_id);

-- ─── NOTIFICATIONS ────────────────────────────────────────
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('warning','info','success','error')),
  order_id UUID REFERENCES orders(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read);

-- ─── ACTIVITY LOGS ────────────────────────────────────────
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  order_id UUID REFERENCES orders(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_logs_order ON activity_logs(order_id);
CREATE INDEX idx_logs_user ON activity_logs(user_id);

-- ─── UPDATED_AT TRIGGERS ──────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_milestones_updated BEFORE UPDATE ON order_milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
