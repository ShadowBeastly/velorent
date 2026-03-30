-- 006_m5_email_qr.sql
-- M5: Email notifications + QR booking widget foundation
--
-- Run AFTER: 005_rentcore_expansion.sql
--
-- Creates: public_booking_settings
-- Alters:  organizations (widget_* columns)
-- Trigger: auto-create public_booking_settings row on org insert
-- ============================================================

BEGIN;

-- ============================================================
-- 1. EXTEND organizations: widget configuration columns
--    (009_m13_widget.sql re-adds these with IF NOT EXISTS for safety)
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS widget_enabled         BOOLEAN   DEFAULT false,
  ADD COLUMN IF NOT EXISTS widget_allowed_domains TEXT[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS widget_primary_color   TEXT      DEFAULT '#1A7D5A',
  ADD COLUMN IF NOT EXISTS widget_theme           TEXT      DEFAULT 'light';

-- ============================================================
-- 2. TABLE: public_booking_settings
--    One row per organization. Controls the embeddable widget
--    and public online-booking page.
-- ============================================================

CREATE TABLE IF NOT EXISTS public_booking_settings (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,

  -- Widget on/off toggle
  is_enabled        BOOLEAN     NOT NULL DEFAULT false,

  -- Auth-free API key for widget embedding (shown in WidgetSettings.jsx)
  public_api_key    TEXT        DEFAULT encode(gen_random_bytes(24), 'hex'),

  -- Styling
  primary_color     TEXT        DEFAULT '#f97316',
  secondary_color   TEXT        DEFAULT '#fbbf24',
  border_radius     INT         DEFAULT 12,
  font_family       TEXT        DEFAULT 'Inter, system-ui, sans-serif',

  -- Booking rules
  min_days          INT         DEFAULT 1,
  max_days          INT         DEFAULT 30,
  max_advance_days  INT         DEFAULT 90,

  -- Required customer fields
  require_email     BOOLEAN     DEFAULT true,
  require_phone     BOOLEAN     DEFAULT false,
  require_address   BOOLEAN     DEFAULT false,

  -- Booking behaviour
  auto_confirm      BOOLEAN     DEFAULT false,
  deposit_required  BOOLEAN     DEFAULT true,

  -- Custom copy
  welcome_text      TEXT,
  success_text      TEXT,
  terms_url         TEXT,
  privacy_url       TEXT,

  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pbs_org ON public_booking_settings(organization_id);

-- ============================================================
-- 3. updated_at trigger for public_booking_settings
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_pbs_updated_at'
      AND tgrelid = 'public_booking_settings'::regclass
  ) THEN
    CREATE TRIGGER set_pbs_updated_at
      BEFORE UPDATE ON public_booking_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ============================================================
-- 4. RLS for public_booking_settings
--    - anon/authenticated can SELECT (needed for widget embed)
--    - only org members (writer role) can UPDATE
--    - INSERT handled by trigger or app code (org members only)
-- ============================================================

ALTER TABLE public_booking_settings ENABLE ROW LEVEL SECURITY;

-- Public read: widget embed needs to fetch settings without auth
DROP POLICY IF EXISTS "PBS public select" ON public_booking_settings;
CREATE POLICY "PBS public select" ON public_booking_settings
  FOR SELECT
  USING (true);

-- Org members can insert their own row
DROP POLICY IF EXISTS "PBS org insert" ON public_booking_settings;
CREATE POLICY "PBS org insert" ON public_booking_settings
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));

-- Org members can update their own row
DROP POLICY IF EXISTS "PBS org update" ON public_booking_settings;
CREATE POLICY "PBS org update" ON public_booking_settings
  FOR UPDATE
  USING  (organization_id IN (SELECT get_user_write_org_ids()))
  WITH CHECK (organization_id IN (SELECT get_user_write_org_ids()));

-- Org members can delete their own row (edge case: org offboarding)
DROP POLICY IF EXISTS "PBS org delete" ON public_booking_settings;
CREATE POLICY "PBS org delete" ON public_booking_settings
  FOR DELETE
  USING (organization_id IN (SELECT get_user_write_org_ids()));

-- ============================================================
-- 5. Trigger: auto-create public_booking_settings on org insert
--    SetupWizard.jsx also inserts explicitly, so this is a
--    safety net for orgs created via other paths.
-- ============================================================

CREATE OR REPLACE FUNCTION create_default_booking_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public_booking_settings (organization_id)
  VALUES (NEW.id)
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_create_booking_settings'
      AND tgrelid = 'organizations'::regclass
  ) THEN
    CREATE TRIGGER trg_create_booking_settings
      AFTER INSERT ON organizations
      FOR EACH ROW EXECUTE FUNCTION create_default_booking_settings();
  END IF;
END $$;

-- ============================================================
-- 6. Grant execute on helper function to authenticated role
-- ============================================================

GRANT EXECUTE ON FUNCTION create_default_booking_settings() TO service_role;

COMMIT;

-- ============================================================
-- Verify with:
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'organizations'
--     AND column_name LIKE 'widget%'
--     ORDER BY column_name;
--   SELECT column_name, data_type FROM information_schema.columns
--     WHERE table_name = 'public_booking_settings'
--     ORDER BY ordinal_position;
--   SELECT tgname FROM pg_trigger WHERE tgrelid = 'organizations'::regclass;
-- ============================================================
