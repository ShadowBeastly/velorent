-- ============================================================
-- 20260326_activities.sql
--
-- Adds the activities table for Lociva-only experiences
-- (wine tasting, spa, guided tours, etc.) that are NOT
-- managed through RentCore's rental/booking system.
--
-- Rental activities (bikes, SUP, etc.) continue to use the
-- existing bikes + bookings tables via RentCore.
--
-- Activities have their own booking flow (to be built later).
-- This migration sets up the schema and the RPC so the
-- hotel widget can already show the "Erlebnisse" tab.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS activities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE,
  hotel_id         UUID REFERENCES hotels(id) ON DELETE SET NULL,  -- optional: exclusive to one hotel
  name             TEXT NOT NULL,
  description      TEXT,
  category         TEXT NOT NULL CHECK (category IN (
    'wine_tasting', 'spa', 'wellness', 'guided_tour',
    'cooking_class', 'escape_room', 'go_kart',
    'sailing', 'hot_air_balloon', 'other'
  )),
  price_per_person DECIMAL(10,2),
  duration_minutes INTEGER,
  max_participants INTEGER,
  status           TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
  images           JSONB DEFAULT '[]',
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_hotel      ON activities(hotel_id) WHERE hotel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_org        ON activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_status     ON activities(status);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "activities_service_role" ON activities
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Anon can read active activities
CREATE POLICY "activities_anon_read" ON activities
  FOR SELECT TO anon
  USING (status = 'active');

-- Authenticated users can manage activities in their own org
CREATE POLICY "activities_org_access" ON activities
  FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

-- ============================================================
-- RPC: get_hotel_activities
-- Returns all active activities for a given hotel slug.
-- Called by the Lociva hotel widget "Erlebnisse" tab.
-- ============================================================
CREATE OR REPLACE FUNCTION get_hotel_activities(p_hotel_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_hotel_id UUID;
BEGIN
  SELECT id INTO v_hotel_id FROM hotels WHERE slug = p_hotel_slug;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('activities', '[]'::jsonb);
  END IF;

  RETURN jsonb_build_object(
    'activities', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',               a.id,
          'name',             a.name,
          'description',      a.description,
          'category',         a.category,
          'price_per_person', a.price_per_person,
          'duration_minutes', a.duration_minutes,
          'max_participants', a.max_participants,
          'images',           a.images,
          'organization_id',  a.organization_id
        ) ORDER BY a.name
      )
      FROM activities a
      WHERE a.status = 'active'
        AND (a.hotel_id = v_hotel_id OR a.hotel_id IS NULL)
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_hotel_activities(TEXT) TO anon, authenticated;

COMMIT;
