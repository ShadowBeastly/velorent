-- ============================================================
-- 20260326_fix_activities_rpc.sql
--
-- Fixes get_hotel_activities() to read from hotel_activities
-- (the canonical table managed by hotel partners in their
-- Lociva dashboard) instead of the provider-level activities
-- table created in 20260326_activities.sql.
--
-- hotel_activities: hotel-curated experiences (hotel partner
--   creates/manages in /hotel/activities dashboard)
-- activities: future provider-level experiences (not yet used)
--
-- The guest widget calls get_hotel_activities() to render the
-- Erlebnisse tab. It must read from hotel_activities so that
-- what hotel partners configure actually appears to guests.
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
          'price_per_person', a.price,
          'duration_minutes', a.duration_minutes,
          'image_url',        a.image_url,
          'sort_order',       a.sort_order
        ) ORDER BY a.sort_order, a.name
      )
      FROM hotel_activities a
      WHERE a.hotel_id = v_hotel_id
        AND a.is_active = true
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_hotel_activities(TEXT) TO anon, authenticated;
