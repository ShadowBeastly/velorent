-- =============================================================================
-- REF-01 to REF-07 + SEC-13/14: Comprehensive fix for broken references
-- after migration 109 dropped compatibility views (bikes, hotels, hotel_users,
-- hotel_activities, hotel_rooms, hotel_providers) and bike_id columns.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- REF-01: Fix get_hotel_activities — references dropped hotels + hotel_activities
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_hotel_activities(p_hotel_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_hotel_id UUID;
BEGIN
  SELECT id INTO v_hotel_id FROM venues WHERE slug = p_hotel_slug;

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
      FROM venue_activities a
      WHERE a.hotel_id = v_hotel_id
        AND a.is_active = true
    ), '[]'::jsonb)
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- REF-02: Fix get_hotel_analytics — references dropped hotel_users
-- Must DROP first because return type changed (JSON vs JSONB)
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS get_hotel_analytics(UUID, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION get_hotel_analytics(
  p_hotel_id UUID,
  p_since    TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days'
)
RETURNS JSON AS $$
DECLARE
  v_scans               INTEGER;
  v_completed_sessions  INTEGER;
  v_bookings_count      INTEGER;
  v_total_volume        DECIMAL(10,2);
  v_total_commission    DECIMAL(10,2);
  v_cancellation_count  INTEGER;
  v_conversion_rate     DECIMAL(5,1);
BEGIN
  -- Authorization: platform admin OR venue_users record
  IF NOT (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM venue_users
      WHERE user_id = auth.uid() AND hotel_id = p_hotel_id
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COUNT(DISTINCT session_id) INTO v_scans
  FROM analytics_events
  WHERE hotel_id = p_hotel_id
    AND event_type = 'qr_scan'
    AND (p_since IS NULL OR created_at >= p_since);

  SELECT COUNT(DISTINCT session_id) INTO v_completed_sessions
  FROM analytics_events
  WHERE hotel_id = p_hotel_id
    AND event_type = 'booking_complete'
    AND (p_since IS NULL OR created_at >= p_since);

  v_conversion_rate := CASE
    WHEN v_scans > 0 THEN ROUND((v_completed_sessions::DECIMAL / v_scans * 100), 1)
    ELSE 0
  END;

  SELECT
    COUNT(*),
    COALESCE(SUM(total_price), 0),
    COALESCE(SUM(platform_commission), 0)
  INTO v_bookings_count, v_total_volume, v_total_commission
  FROM bookings
  WHERE hotel_id = p_hotel_id
    AND booking_source = 'hotel_qr'
    AND status NOT IN ('cancelled')
    AND (p_since IS NULL OR created_at >= p_since);

  SELECT COUNT(*) INTO v_cancellation_count
  FROM bookings
  WHERE hotel_id = p_hotel_id
    AND booking_source = 'hotel_qr'
    AND cancellation_status != 'none'
    AND (p_since IS NULL OR created_at >= p_since);

  RETURN jsonb_build_object(
    'qr_scans',           v_scans,
    'booking_sessions',   v_completed_sessions,
    'conversion_rate',    v_conversion_rate,
    'bookings_count',     v_bookings_count,
    'cancellation_count', v_cancellation_count,
    'total_volume',       v_total_volume,
    'total_commission',   v_total_commission
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─────────────────────────────────────────────────────────────────────────────
-- REF-03 + SEC-14: Fix get_hotel_dashboard — broken view refs + hide commission
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_hotel_dashboard(p_hotel_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_result JSON;
BEGIN
    IF NOT (
        is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM venue_users
            WHERE user_id = auth.uid() AND hotel_id = p_hotel_id
        )
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT json_build_object(
        'qr_scans_30d', (
            SELECT COUNT(*) FROM analytics_events
            WHERE hotel_id = p_hotel_id
              AND event_type = 'qr_scan'
              AND created_at > now() - INTERVAL '30 days'
        ),
        'bookings_30d', (
            SELECT COUNT(*) FROM bookings
            WHERE hotel_id = p_hotel_id
              AND created_at > now() - INTERVAL '30 days'
        ),
        'active_activities', (
            SELECT COUNT(*) FROM venue_activities
            WHERE hotel_id = p_hotel_id AND is_active = true
        ),
        'rooms_with_qr', (
            SELECT COUNT(*) FROM venue_areas
            WHERE hotel_id = p_hotel_id AND has_qr_code = true
        ),
        'recent_bookings', (
            SELECT COALESCE(json_agg(row_to_json(b.*)), '[]'::json)
            FROM (
                -- SEC-14: platform_commission removed — hotel users should not see it
                SELECT id, booking_number, guest_name, guest_email,
                       start_date, end_date, total_price, status, created_at
                FROM bookings
                WHERE hotel_id = p_hotel_id
                ORDER BY created_at DESC
                LIMIT 20
            ) b
        ),
        'hotel', (
            SELECT row_to_json(h.*)
            FROM venues h WHERE h.id = p_hotel_id
        ),
        'provider_count', (
            SELECT COUNT(*) FROM venue_providers
            WHERE hotel_id = p_hotel_id AND is_active = true
        ),
        'stats', json_build_object(
            'total_bookings', (
                SELECT COUNT(*) FROM bookings
                WHERE hotel_id = p_hotel_id
            ),
            'total_revenue', (
                SELECT COALESCE(SUM(total_price), 0) FROM bookings
                WHERE hotel_id = p_hotel_id AND status NOT IN ('cancelled')
            ),
            'qr_scans_30d', (
                SELECT COUNT(*) FROM analytics_events
                WHERE hotel_id = p_hotel_id
                  AND event_type = 'qr_scan'
                  AND created_at > now() - INTERVAL '30 days'
            ),
            'bookings_30d', (
                SELECT COUNT(*) FROM bookings
                WHERE hotel_id = p_hotel_id
                  AND created_at > now() - INTERVAL '30 days'
            )
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEC-13: Fix get_due_maintenances — add org membership check + fix bikes ref
-- Must DROP first because language changes from sql to plpgsql
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS get_due_maintenances(UUID);
CREATE OR REPLACE FUNCTION get_due_maintenances(p_org_id UUID)
RETURNS TABLE (
  id                UUID,
  bike_id           UUID,
  bike_name         TEXT,
  type              TEXT,
  interval_days     INT,
  interval_rentals  INT,
  last_performed_at TIMESTAMPTZ,
  next_due_at       TIMESTAMPTZ,
  is_overdue        BOOLEAN,
  days_overdue      INT,
  total_rentals     INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SEC-13: Verify caller is a member of the organization
  IF NOT (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid() AND organization_id = p_org_id
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    ms.id,
    ms.bike_id,
    i.name  AS bike_name,
    ms.type,
    ms.interval_days,
    ms.interval_rentals,
    ms.last_performed_at,
    ms.next_due_at,
    (ms.next_due_at < now())                                          AS is_overdue,
    GREATEST(0, EXTRACT(DAY FROM (now() - ms.next_due_at))::INT)      AS days_overdue,
    COALESCE(bh.total_rentals, 0)                                     AS total_rentals
  FROM maintenance_schedules ms
  JOIN items i ON i.id = ms.bike_id
  LEFT JOIN item_health bh ON bh.bike_id = ms.bike_id
  WHERE ms.organization_id = p_org_id
    AND ms.next_due_at IS NOT NULL
    AND ms.next_due_at <= (now() + INTERVAL '7 days')
  ORDER BY ms.next_due_at ASC;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- REF-04: Fix 11 RLS policies on venue_activities/venue_areas
-- They reference dropped hotel_users view — must use venue_users
-- ─────────────────────────────────────────────────────────────────────────────

-- venue_activities policies (originally created ON hotel_activities in 011)
DROP POLICY IF EXISTS "hotel_activities_hotel_user_select" ON venue_activities;
DROP POLICY IF EXISTS "hotel_activities_hotel_user_insert" ON venue_activities;
DROP POLICY IF EXISTS "hotel_activities_hotel_user_update" ON venue_activities;
DROP POLICY IF EXISTS "hotel_activities_hotel_user_delete" ON venue_activities;
DROP POLICY IF EXISTS "hotel_activities_public_read"       ON venue_activities;
DROP POLICY IF EXISTS "hotel_activities_admin_all"         ON venue_activities;

CREATE POLICY "venue_activities_admin_all" ON venue_activities
    FOR ALL USING (is_platform_admin());

CREATE POLICY "venue_activities_user_select" ON venue_activities
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM venue_users vu
        WHERE vu.user_id = auth.uid() AND vu.hotel_id = venue_activities.hotel_id
    ));

CREATE POLICY "venue_activities_user_insert" ON venue_activities
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM venue_users vu
        WHERE vu.user_id = auth.uid() AND vu.hotel_id = venue_activities.hotel_id
          AND vu.role = 'admin'
    ));

CREATE POLICY "venue_activities_user_update" ON venue_activities
    FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM venue_users vu
        WHERE vu.user_id = auth.uid() AND vu.hotel_id = venue_activities.hotel_id
          AND vu.role = 'admin'
    ));

CREATE POLICY "venue_activities_user_delete" ON venue_activities
    FOR DELETE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM venue_users vu
        WHERE vu.user_id = auth.uid() AND vu.hotel_id = venue_activities.hotel_id
          AND vu.role = 'admin'
    ));

CREATE POLICY "venue_activities_public_read" ON venue_activities
    FOR SELECT TO anon
    USING (
        is_active = true
        AND EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_activities.hotel_id AND v.is_active = true)
    );

-- venue_areas policies (originally created ON hotel_rooms in 011)
DROP POLICY IF EXISTS "hotel_rooms_hotel_user_select" ON venue_areas;
DROP POLICY IF EXISTS "hotel_rooms_hotel_user_insert" ON venue_areas;
DROP POLICY IF EXISTS "hotel_rooms_hotel_user_update" ON venue_areas;
DROP POLICY IF EXISTS "hotel_rooms_hotel_user_delete" ON venue_areas;
DROP POLICY IF EXISTS "hotel_rooms_admin_all"         ON venue_areas;

CREATE POLICY "venue_areas_admin_all" ON venue_areas
    FOR ALL USING (is_platform_admin());

CREATE POLICY "venue_areas_user_select" ON venue_areas
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM venue_users vu
        WHERE vu.user_id = auth.uid() AND vu.hotel_id = venue_areas.hotel_id
    ));

CREATE POLICY "venue_areas_user_insert" ON venue_areas
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM venue_users vu
        WHERE vu.user_id = auth.uid() AND vu.hotel_id = venue_areas.hotel_id
          AND vu.role = 'admin'
    ));

CREATE POLICY "venue_areas_user_update" ON venue_areas
    FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM venue_users vu
        WHERE vu.user_id = auth.uid() AND vu.hotel_id = venue_areas.hotel_id
          AND vu.role = 'admin'
    ));

CREATE POLICY "venue_areas_user_delete" ON venue_areas
    FOR DELETE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM venue_users vu
        WHERE vu.user_id = auth.uid() AND vu.hotel_id = venue_areas.hotel_id
          AND vu.role = 'admin'
    ));

-- ─────────────────────────────────────────────────────────────────────────────
-- REF-05: Fix analytics_events_insert_anon — references dropped hotels view
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "analytics_events_insert_anon" ON analytics_events;
CREATE POLICY "analytics_events_insert_anon" ON analytics_events
    FOR INSERT WITH CHECK (
      hotel_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM venues
        WHERE id = hotel_id AND is_active = true
      )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- REF-07: Recreate exclusion constraint for double-booking protection
-- The original constraints referenced bike_id which was dropped in migration 109.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Only add if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_no_item_overlap'
  ) THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_no_item_overlap
      EXCLUDE USING gist (
        item_id WITH =,
        daterange(start_date, end_date, '[]') WITH &&
      )
      WHERE (status NOT IN ('cancelled'));
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Could not create exclusion constraint: %', SQLERRM;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- REF-17: Fix dashboard_stats view — references dropped bikes view
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
    o.id as organization_id,
    (SELECT COUNT(*) FROM items WHERE organization_id = o.id AND status = 'available') as available_bikes,
    (SELECT COUNT(*) FROM items WHERE organization_id = o.id AND status = 'rented') as rented_bikes,
    (SELECT COUNT(*) FROM bookings WHERE organization_id = o.id AND status IN ('reserved', 'confirmed')) as pending_bookings,
    (SELECT COUNT(*) FROM bookings WHERE organization_id = o.id AND status = 'picked_up') as active_rentals,
    (SELECT COALESCE(SUM(total_price), 0) FROM bookings WHERE organization_id = o.id
        AND status IN ('picked_up', 'returned')
        AND start_date >= DATE_TRUNC('month', CURRENT_DATE)) as month_revenue,
    (SELECT COUNT(*) FROM bookings WHERE organization_id = o.id
        AND start_date = CURRENT_DATE
        AND status IN ('reserved', 'confirmed')) as today_pickups,
    (SELECT COUNT(*) FROM bookings WHERE organization_id = o.id
        AND end_date = CURRENT_DATE
        AND status = 'picked_up') as today_returns
FROM organizations o;

-- ─────────────────────────────────────────────────────────────────────────────
-- REF-18: Remove duplicate customer stats trigger (conflicting logic)
-- Keep only the newer sync_customer_booking_stats which handles DELETE + scopes by org
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS update_customer_stats_trigger ON bookings;
DROP FUNCTION IF EXISTS update_customer_stats();

-- ─────────────────────────────────────────────────────────────────────────────
-- REF-19: Fix activities table RLS — references nonexistent organization_users
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "activities_org_access" ON activities;
CREATE POLICY "activities_org_access" ON activities
  FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- REF-21: Add missing indexes for performance
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_item_id ON bookings(item_id);
CREATE INDEX IF NOT EXISTS idx_bookings_venue_id ON bookings(venue_id) WHERE venue_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_venue_id ON analytics_events(venue_id) WHERE venue_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- REF-22: Add missing foreign keys
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bookings_item_id') THEN
    ALTER TABLE bookings ADD CONSTRAINT fk_bookings_item_id
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'fk_bookings_item_id: %', SQLERRM;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bookings_venue_id') THEN
    ALTER TABLE bookings ADD CONSTRAINT fk_bookings_venue_id
      FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'fk_bookings_venue_id: %', SQLERRM;
END;
$$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ROLLBACK instructions (manual):
-- DROP POLICY IF EXISTS "venue_activities_admin_all" ON venue_activities;
-- DROP POLICY IF EXISTS "venue_activities_user_select" ON venue_activities;
-- ... (recreate original policies with hotel_users references)
-- DROP INDEX IF EXISTS idx_bookings_item_id;
-- DROP INDEX IF EXISTS idx_bookings_venue_id;
-- DROP INDEX IF EXISTS idx_org_members_user_id;
