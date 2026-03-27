-- Migration: Commission rates table
-- Rollback: DROP TABLE IF EXISTS commission_rates;
-- Dependencies: none

BEGIN;

CREATE TABLE IF NOT EXISTS commission_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_type TEXT UNIQUE NOT NULL,
  rate DECIMAL(5,4) NOT NULL DEFAULT 0.05,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE commission_rates ENABLE ROW LEVEL SECURITY;

-- Read access for all roles (rates are not secret)
CREATE POLICY "Commission rates readable by all" ON commission_rates
  FOR SELECT USING (true);

-- Only service_role can modify (via migrations/admin)
-- No INSERT/UPDATE/DELETE policies for authenticated/anon

-- Seed all current rates
INSERT INTO commission_rates (item_type, rate) VALUES
  ('E-Bike', 0.05),
  ('Mountainbike', 0.05),
  ('City-Bike', 0.05),
  ('Trekking', 0.05),
  ('E-MTB', 0.05),
  ('Lastenrad', 0.05),
  ('Canoe', 0.10),
  ('SUP', 0.10),
  ('Go-Kart', 0.10),
  ('Climbing', 0.10),
  ('Escape Room', 0.10),
  ('Guided Tour', 0.12),
  ('Wine Tasting', 0.12),
  ('Wellness', 0.12),
  ('Spa', 0.12),
  ('Hot Air Balloon', 0.15),
  ('Sailing', 0.15)
ON CONFLICT (item_type) DO NOTHING;

NOTIFY pgrst, 'reload schema';

COMMIT;
