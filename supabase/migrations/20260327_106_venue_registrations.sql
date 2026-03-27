-- Migration: Venue self-registration infrastructure
-- Rollback: DROP TABLE IF EXISTS venue_registrations; DROP FUNCTION IF EXISTS register_self_managed_venue;
-- Dependencies: 20260327_104_rename_hotels_to_venues.sql

BEGIN;

-- venue_registrations table — tracks self-service venue sign-ups pending admin approval
CREATE TABLE IF NOT EXISTS venue_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE venue_registrations ENABLE ROW LEVEL SECURITY;

-- Superadmins can read all registrations
CREATE POLICY "Superadmins can manage registrations" ON venue_registrations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- Users can read their own registrations
CREATE POLICY "Users can read own registrations" ON venue_registrations
  FOR SELECT USING (submitted_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_venue_registrations_status ON venue_registrations(status);
CREATE INDEX IF NOT EXISTS idx_venue_registrations_venue ON venue_registrations(venue_id);

-- RPC: register_self_managed_venue
-- Creates a new venue (is_active=false, is_self_managed=true), links user, creates registration
CREATE OR REPLACE FUNCTION register_self_managed_venue(
  p_name TEXT,
  p_address TEXT,
  p_venue_type TEXT DEFAULT 'airbnb',
  p_contact_email TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_venue_id UUID;
  v_registration_id UUID;
  v_slug TEXT;
  v_user UUID;
BEGIN
  v_user := COALESCE(p_user_id, auth.uid());

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Generate slug from name
  v_slug := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Create venue (inactive until approved)
  INSERT INTO venues (name, slug, address, venue_type, is_self_managed, is_active, contact_email)
  VALUES (p_name, v_slug, p_address, p_venue_type, true, false, p_contact_email)
  RETURNING id INTO v_venue_id;

  -- Link user to venue
  INSERT INTO venue_users (hotel_id, user_id, role)
  VALUES (v_venue_id, v_user, 'admin');

  -- Create registration record
  INSERT INTO venue_registrations (venue_id, submitted_by, status)
  VALUES (v_venue_id, v_user, 'pending')
  RETURNING id INTO v_registration_id;

  RETURN jsonb_build_object(
    'venue_id', v_venue_id,
    'registration_id', v_registration_id,
    'slug', v_slug,
    'status', 'pending'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION register_self_managed_venue(TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
