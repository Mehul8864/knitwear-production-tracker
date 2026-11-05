-- ============================================================
-- StitchOps Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tna_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tna_template_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_date_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- ─── PROFILES ─────────────────────────────────────────────
CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "Merchandisers can read all profiles"
  ON profiles FOR SELECT USING (get_user_role() = 'merchandiser');

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (id = auth.uid());

-- ─── BUYERS ───────────────────────────────────────────────
CREATE POLICY "Authenticated users can read buyers"
  ON buyers FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Merchandisers can manage buyers"
  ON buyers FOR ALL USING (get_user_role() = 'merchandiser');

-- ─── PRODUCTION UNITS ─────────────────────────────────────
CREATE POLICY "Authenticated users can read units"
  ON production_units FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Merchandisers can manage units"
  ON production_units FOR ALL USING (get_user_role() = 'merchandiser');

-- ─── ORDERS ───────────────────────────────────────────────
-- Merchandisers see all orders
CREATE POLICY "Merchandisers see all orders"
  ON orders FOR SELECT USING (get_user_role() = 'merchandiser');

-- Supervisors see orders assigned to their unit
CREATE POLICY "Supervisors see their unit orders"
  ON orders FOR SELECT USING (
    get_user_role() = 'supervisor' AND
    production_unit_id IN (
      SELECT production_unit_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Merchandisers can create and update orders
CREATE POLICY "Merchandisers can create orders"
  ON orders FOR INSERT WITH CHECK (get_user_role() = 'merchandiser');

CREATE POLICY "Merchandisers can update orders"
  ON orders FOR UPDATE USING (get_user_role() = 'merchandiser');

-- Supervisors can update orders (for stage/quantity updates)
CREATE POLICY "Supervisors can update their orders"
  ON orders FOR UPDATE USING (
    get_user_role() = 'supervisor' AND
    production_unit_id IN (
      SELECT production_unit_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ─── ORDER ITEMS ──────────────────────────────────────────
CREATE POLICY "Authenticated users can read order items"
  ON order_items FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Merchandisers can manage order items"
  ON order_items FOR ALL USING (get_user_role() = 'merchandiser');

-- ─── TNA TEMPLATES ────────────────────────────────────────
CREATE POLICY "Authenticated users can read templates"
  ON tna_templates FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Merchandisers can manage templates"
  ON tna_templates FOR ALL USING (get_user_role() = 'merchandiser');

CREATE POLICY "Authenticated users can read template milestones"
  ON tna_template_milestones FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Merchandisers can manage template milestones"
  ON tna_template_milestones FOR ALL USING (get_user_role() = 'merchandiser');

-- ─── ORDER MILESTONES ─────────────────────────────────────
CREATE POLICY "Authenticated users can read milestones"
  ON order_milestones FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Merchandisers can manage milestones"
  ON order_milestones FOR ALL USING (get_user_role() = 'merchandiser');

-- ─── MILESTONE DATE CHANGE HISTORY ────────────────────────
CREATE POLICY "Authenticated users can read date history"
  ON milestone_date_change_history FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Merchandisers can insert date history"
  ON milestone_date_change_history FOR INSERT WITH CHECK (get_user_role() = 'merchandiser');

-- ─── PRODUCTION UPDATES ───────────────────────────────────
CREATE POLICY "Merchandisers can read all updates"
  ON production_updates FOR SELECT USING (get_user_role() = 'merchandiser');

CREATE POLICY "Supervisors can read updates for their orders"
  ON production_updates FOR SELECT USING (
    get_user_role() = 'supervisor' AND (
      supervisor_id = auth.uid() OR
      order_id IN (
        SELECT id FROM orders WHERE production_unit_id IN (
          SELECT production_unit_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Supervisors can submit updates"
  ON production_updates FOR INSERT WITH CHECK (
    supervisor_id = auth.uid()
  );

CREATE POLICY "Merchandisers can update AI corrections"
  ON production_updates FOR UPDATE USING (get_user_role() = 'merchandiser');

-- ─── AI CLASSIFICATIONS ───────────────────────────────────
CREATE POLICY "Merchandisers can manage AI classifications"
  ON ai_classifications FOR ALL USING (get_user_role() = 'merchandiser');

-- ─── BUYER ACCESS TOKENS ──────────────────────────────────
CREATE POLICY "Merchandisers can manage buyer tokens"
  ON buyer_access_tokens FOR ALL USING (get_user_role() = 'merchandiser');

-- ─── NOTIFICATIONS ────────────────────────────────────────
CREATE POLICY "Users see their own notifications"
  ON notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their notifications"
  ON notifications FOR UPDATE USING (user_id = auth.uid());

-- ─── ACTIVITY LOGS ────────────────────────────────────────
CREATE POLICY "Merchandisers can read activity logs"
  ON activity_logs FOR SELECT USING (get_user_role() = 'merchandiser');

CREATE POLICY "Authenticated users can create logs"
  ON activity_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
