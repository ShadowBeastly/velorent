-- ============================================================
-- 005_rentcore_expansion.sql
-- RentCore Feature Expansion — All new tables and columns
-- Run AFTER: 001_lociva_extension.sql, 002_cancellation_token.sql,
--            003_security_fixes.sql, 004_fix_hotel_rpc_price_per_hour.sql
--
-- Creates: deposits, email_log, pricing_rule_conditions,
--          maintenance_schedules, bike_health, coupons,
--          coupon_usages, handover_protocols, condition_photos,
--          damage_reports, api_keys
-- Alters:  bikes (buffer, deposit), bookings (confirmation, signature),
--          pricing_rules (adjustment columns),
--          maintenance_logs (schedule_id, parts_used, photos)
-- RLS:     All new tables follow org-scoped pattern
-- ============================================================

BEGIN;

-- ============================================================
-- 1. EXTEND EXISTING TABLES
-- ============================================================

-- bikes: buffer time + deposit management
ALTER TABLE bikes
  ADD COLUMN IF NOT EXISTS buffer_minutes      INT DEFAULT 120,
  ADD COLUMN IF NOT EXISTS deposit_amount      DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_type        TEXT DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS deposit_percentage  DECIMAL(5,2) DEFAULT 0;

-- bookings: confirmation code + QR + signature
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS confirmation_code   VARCHAR(8),
  ADD COLUMN IF NOT EXISTS qr_code_url         TEXT,
  ADD COLUMN IF NOT EXISTS email_sent_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signature_url       TEXT,
  ADD COLUMN IF NOT EXISTS signed_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_contract_url TEXT;

-- Unique constraint on confirmation_code (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_confirmation_code_key'
  ) THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_confirmation_code_key UNIQUE (confirmation_code);
  END IF;
END $$;

-- pricing_rules: add expansion columns (type + adjustment model)
ALTER TABLE pricing_rules
  ADD COLUMN IF NOT EXISTS adjustment_type   TEXT,   -- 'percentage' | 'fixed'
  ADD COLUMN IF NOT EXISTS adjustment_value  DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS applies_to        TEXT DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS bike_category_id  UUID,
  ADD COLUMN IF NOT EXISTS bike_id           UUID REFERENCES bikes(id) ON DELETE SET NULL;

-- maintenance_logs: add expansion columns
ALTER TABLE maintenance_logs
  ADD COLUMN IF NOT EXISTS schedule_id UUID,
  ADD COLUMN IF NOT EXISTS parts_used  TEXT[],
  ADD COLUMN IF NOT EXISTS photos      TEXT[];

-- ============================================================
-- 2. NEW TABLE: deposits
-- ============================================================

CREATE TABLE IF NOT EXISTS deposits (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id               UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount                   DECIMAL(10,2) NOT NULL,
  status                   TEXT NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  charged_amount           DECIMAL(10,2) DEFAULT 0,
  charge_reason            TEXT,
  created_at               TIMESTAMPTZ DEFAULT now(),
  released_at              TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_deposits_org     ON deposits(organization_id);
CREATE INDEX IF NOT EXISTS idx_deposits_booking ON deposits(booking_id);

ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deposits view" ON deposits
  FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Deposits insert" ON deposits
  FOR INSERT WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));

CREATE POLICY "Deposits update" ON deposits
  FOR UPDATE
  USING  (organization_id IN (SELECT get_user_write_org_ids()))
  WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));

CREATE POLICY "Deposits delete" ON deposits
  FOR DELETE USING (organization_id IN (SELECT get_user_write_org_ids()));

-- ============================================================
-- 3. NEW TABLE: email_log
-- ============================================================

CREATE TABLE IF NOT EXISTS email_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  template   TEXT,
  sent_at    TIMESTAMPTZ DEFAULT now(),
  status     TEXT,
  resend_id  TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_log_booking ON email_log(booking_id);

-- email_log scoped via booking → organization; no direct org_id column.
-- Access granted to org members through booking ownership.
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Email log view" ON email_log
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Email log insert" ON email_log
  FOR INSERT WITH CHECK (
    booking_id IN (
      SELECT id FROM bookings
      WHERE organization_id IN (SELECT get_user_write_org_ids())
    )
  );

CREATE POLICY "Email log update" ON email_log
  FOR UPDATE
  USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE organization_id IN (SELECT get_user_write_org_ids())
    )
  )
  WITH CHECK (
    booking_id IN (
      SELECT id FROM bookings
      WHERE organization_id IN (SELECT get_user_write_org_ids())
    )
  );

CREATE POLICY "Email log delete" ON email_log
  FOR DELETE USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE organization_id IN (SELECT get_user_write_org_ids())
    )
  );

-- ============================================================
-- 4. NEW TABLE: pricing_rule_conditions
-- ============================================================

CREATE TABLE IF NOT EXISTS pricing_rule_conditions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id        UUID NOT NULL REFERENCES pricing_rules(id) ON DELETE CASCADE,
  condition_type TEXT,           -- 'date_range' | 'weekday' | 'time_range' | 'min_duration' | 'min_quantity'
  date_start     DATE,
  date_end       DATE,
  weekdays       INT[],          -- {1,2,3,4,5} = Mon-Fri
  time_start     TIME,
  time_end       TIME,
  min_value      INT             -- generic minimum (days or quantity depending on condition_type)
);

CREATE INDEX IF NOT EXISTS idx_prc_rule ON pricing_rule_conditions(rule_id);

-- Scoped via rule → organization; inherits via pricing_rules.
ALTER TABLE pricing_rule_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PRC view" ON pricing_rule_conditions
  FOR SELECT USING (
    rule_id IN (
      SELECT id FROM pricing_rules
      WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "PRC insert" ON pricing_rule_conditions
  FOR INSERT WITH CHECK (
    rule_id IN (
      SELECT id FROM pricing_rules
      WHERE organization_id IN (SELECT get_user_write_org_ids())
    )
  );

CREATE POLICY "PRC update" ON pricing_rule_conditions
  FOR UPDATE
  USING (
    rule_id IN (
      SELECT id FROM pricing_rules
      WHERE organization_id IN (SELECT get_user_write_org_ids())
    )
  )
  WITH CHECK (
    rule_id IN (
      SELECT id FROM pricing_rules
      WHERE organization_id IN (SELECT get_user_write_org_ids())
    )
  );

CREATE POLICY "PRC delete" ON pricing_rule_conditions
  FOR DELETE USING (
    rule_id IN (
      SELECT id FROM pricing_rules
      WHERE organization_id IN (SELECT get_user_write_org_ids())
    )
  );

-- ============================================================
-- 5. NEW TABLE: maintenance_schedules
-- ============================================================

CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bike_id           UUID NOT NULL REFERENCES bikes(id) ON DELETE CASCADE,
  type              TEXT,         -- 'routine' | 'brake' | 'tire' | 'chain' | 'battery' | 'full_service'
  interval_days     INT,
  interval_rentals  INT,
  last_performed_at TIMESTAMPTZ,
  next_due_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ms_org  ON maintenance_schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_ms_bike ON maintenance_schedules(bike_id);

ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MS view" ON maintenance_schedules
  FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "MS insert" ON maintenance_schedules
  FOR INSERT WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));

CREATE POLICY "MS update" ON maintenance_schedules
  FOR UPDATE
  USING  (organization_id IN (SELECT get_user_write_org_ids()))
  WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));

CREATE POLICY "MS delete" ON maintenance_schedules
  FOR DELETE USING (organization_id IN (SELECT get_user_write_org_ids()));

-- ============================================================
-- 6. NEW TABLE: bike_health
-- ============================================================

CREATE TABLE IF NOT EXISTS bike_health (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_id               UUID NOT NULL UNIQUE REFERENCES bikes(id) ON DELETE CASCADE,
  total_rentals         INT DEFAULT 0,
  total_rental_days     INT DEFAULT 0,
  brake_status          TEXT DEFAULT 'good',
  tire_front_status     TEXT DEFAULT 'good',
  tire_rear_status      TEXT DEFAULT 'good',
  chain_status          TEXT DEFAULT 'good',
  battery_health_percent INT DEFAULT 100,
  last_full_service     TIMESTAMPTZ,
  notes                 TEXT,
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bike_health_bike ON bike_health(bike_id);

-- Scoped via bike → organization.
ALTER TABLE bike_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bike health view" ON bike_health
  FOR SELECT USING (
    bike_id IN (
      SELECT id FROM bikes
      WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Bike health insert" ON bike_health
  FOR INSERT WITH CHECK (
    bike_id IN (
      SELECT id FROM bikes
      WHERE organization_id IN (SELECT get_user_write_org_ids())
    )
  );

CREATE POLICY "Bike health update" ON bike_health
  FOR UPDATE
  USING (
    bike_id IN (
      SELECT id FROM bikes
      WHERE organization_id IN (SELECT get_user_write_org_ids())
    )
  )
  WITH CHECK (
    bike_id IN (
      SELECT id FROM bikes
      WHERE organization_id IN (SELECT get_user_write_org_ids())
    )
  );

CREATE POLICY "Bike health delete" ON bike_health
  FOR DELETE USING (
    bike_id IN (
      SELECT id FROM bikes
      WHERE organization_id IN (SELECT get_user_write_org_ids())
    )
  );

-- ============================================================
-- 7. NEW TABLE: coupons
-- ============================================================

CREATE TABLE IF NOT EXISTS coupons (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code              VARCHAR NOT NULL,
  type              TEXT,          -- 'percentage' | 'fixed'
  value             DECIMAL(10,2),
  min_order_value   DECIMAL(10,2) DEFAULT 0,
  min_duration_days INT DEFAULT 0,
  min_quantity      INT DEFAULT 0,
  max_uses          INT,
  used_count        INT DEFAULT 0,
  valid_from        TIMESTAMPTZ,
  valid_until       TIMESTAMPTZ,
  applies_to        TEXT DEFAULT 'all',
  bike_category_id  UUID,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_coupons_org  ON coupons(organization_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coupons view" ON coupons
  FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Coupons insert" ON coupons
  FOR INSERT WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));

CREATE POLICY "Coupons update" ON coupons
  FOR UPDATE
  USING  (organization_id IN (SELECT get_user_write_org_ids()))
  WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));

CREATE POLICY "Coupons delete" ON coupons
  FOR DELETE USING (organization_id IN (SELECT get_user_write_org_ids()));

-- ============================================================
-- 8. NEW TABLE: coupon_usages
-- ============================================================

CREATE TABLE IF NOT EXISTS coupon_usages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id       UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  discount_amount DECIMAL(10,2),
  used_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cu_coupon  ON coupon_usages(coupon_id);
CREATE INDEX IF NOT EXISTS idx_cu_booking ON coupon_usages(booking_id);

-- Scoped via booking → organization.
ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coupon usages view" ON coupon_usages
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Coupon usages insert" ON coupon_usages
  FOR INSERT WITH CHECK (
    booking_id IN (
      SELECT id FROM bookings
      WHERE organization_id IN (SELECT get_user_write_org_ids())
    )
  );

CREATE POLICY "Coupon usages update" ON coupon_usages
  FOR UPDATE
  USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE organization_id IN (SELECT get_user_write_org_ids())
    )
  )
  WITH CHECK (
    booking_id IN (
      SELECT id FROM bookings
      WHERE organization_id IN (SELECT get_user_write_org_ids())
    )
  );

CREATE POLICY "Coupon usages delete" ON coupon_usages
  FOR DELETE USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE organization_id IN (SELECT get_user_write_org_ids())
    )
  );

-- ============================================================
-- 9. NEW TABLE: handover_protocols
-- ============================================================

CREATE TABLE IF NOT EXISTS handover_protocols (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id           UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  type                 TEXT,        -- 'pickup' | 'return'
  performed_by         VARCHAR,
  bike_condition_notes TEXT,
  checklist            JSONB,
  created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hp_org     ON handover_protocols(organization_id);
CREATE INDEX IF NOT EXISTS idx_hp_booking ON handover_protocols(booking_id);

ALTER TABLE handover_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Handover protocols view" ON handover_protocols
  FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Handover protocols insert" ON handover_protocols
  FOR INSERT WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));

CREATE POLICY "Handover protocols update" ON handover_protocols
  FOR UPDATE
  USING  (organization_id IN (SELECT get_user_write_org_ids()))
  WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));

CREATE POLICY "Handover protocols delete" ON handover_protocols
  FOR DELETE USING (organization_id IN (SELECT get_user_write_org_ids()));

-- ============================================================
-- 10. NEW TABLE: condition_photos
-- ============================================================

CREATE TABLE IF NOT EXISTS condition_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id   UUID NOT NULL REFERENCES handover_protocols(id) ON DELETE CASCADE,
  photo_url     TEXT,
  thumbnail_url TEXT,
  position      TEXT,      -- 'front' | 'rear' | 'left_side' | 'right_side' | 'top' | 'detail'
  annotations   JSONB,     -- [{x, y, radius, label, severity}]
  taken_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cp_protocol ON condition_photos(protocol_id);

-- Scoped via protocol → booking → organization.
ALTER TABLE condition_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Condition photos view" ON condition_photos
  FOR SELECT USING (
    protocol_id IN (
      SELECT id FROM handover_protocols
      WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Condition photos insert" ON condition_photos
  FOR INSERT WITH CHECK (
    protocol_id IN (
      SELECT id FROM handover_protocols
      WHERE organization_id IN (SELECT get_user_write_org_ids())
    )
  );

CREATE POLICY "Condition photos update" ON condition_photos
  FOR UPDATE
  USING (
    protocol_id IN (
      SELECT id FROM handover_protocols
      WHERE organization_id IN (SELECT get_user_write_org_ids())
    )
  )
  WITH CHECK (
    protocol_id IN (
      SELECT id FROM handover_protocols
      WHERE organization_id IN (SELECT get_user_write_org_ids())
    )
  );

CREATE POLICY "Condition photos delete" ON condition_photos
  FOR DELETE USING (
    protocol_id IN (
      SELECT id FROM handover_protocols
      WHERE organization_id IN (SELECT get_user_write_org_ids())
    )
  );

-- ============================================================
-- 11. NEW TABLE: damage_reports
-- ============================================================

CREATE TABLE IF NOT EXISTS damage_reports (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id           UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  pickup_protocol_id   UUID REFERENCES handover_protocols(id) ON DELETE SET NULL,
  return_protocol_id   UUID REFERENCES handover_protocols(id) ON DELETE SET NULL,
  damages              JSONB,     -- [{description, severity, photo_id, estimated_cost}]
  total_estimated_cost DECIMAL(10,2),
  deposit_charged      DECIMAL(10,2) DEFAULT 0,
  status               TEXT DEFAULT 'detected',  -- 'detected' | 'customer_notified' | 'resolved' | 'disputed'
  created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dr_org     ON damage_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_dr_booking ON damage_reports(booking_id);

ALTER TABLE damage_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Damage reports view" ON damage_reports
  FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Damage reports insert" ON damage_reports
  FOR INSERT WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));

CREATE POLICY "Damage reports update" ON damage_reports
  FOR UPDATE
  USING  (organization_id IN (SELECT get_user_write_org_ids()))
  WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));

CREATE POLICY "Damage reports delete" ON damage_reports
  FOR DELETE USING (organization_id IN (SELECT get_user_write_org_ids()));

-- ============================================================
-- 12. NEW TABLE: api_keys
-- ============================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key_hash        TEXT NOT NULL,     -- SHA-256 of raw key
  key_prefix      VARCHAR,           -- first 8 chars shown in UI
  name            VARCHAR,
  permissions     TEXT[],
  last_used_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_org  ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "API keys view" ON api_keys
  FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "API keys insert" ON api_keys
  FOR INSERT WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));

CREATE POLICY "API keys update" ON api_keys
  FOR UPDATE
  USING  (organization_id IN (SELECT get_user_write_org_ids()))
  WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));

CREATE POLICY "API keys delete" ON api_keys
  FOR DELETE USING (organization_id IN (SELECT get_user_write_org_ids()));

COMMIT;

-- ============================================================
-- Verify with:
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'bikes' AND column_name IN ('buffer_minutes','deposit_amount','deposit_type','deposit_percentage');
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'bookings' AND column_name IN ('confirmation_code','qr_code_url','signature_url');
--   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('deposits','email_log','pricing_rule_conditions','maintenance_schedules','bike_health','coupons','coupon_usages','handover_protocols','condition_photos','damage_reports','api_keys');
--   SELECT polname, polrelid::regclass FROM pg_policy WHERE polrelid::regclass::text IN ('deposits','email_log','maintenance_schedules','bike_health','coupons','handover_protocols','damage_reports','api_keys') ORDER BY polrelid::regclass;
-- ============================================================
