-- ============================================================
-- 011_lociva_hotel_dashboard.sql
-- Lociva Hotel Partner Dashboard - new tables and columns
--
-- Adds:
--   1. hotel_activities - hotels create own experiences (spa, tours, etc.)
--   2. hotel_rooms - QR code per room/area
--   3. hotels columns: welcome_message, logo_url, theme_color
--   4. RLS policies for hotel users + platform admins
--
-- Run AFTER: 001_lociva_extension.sql (hotels table must exist)
-- ============================================================

-- ── 1. Extend hotels table ─────────────────────────────────

ALTER TABLE hotels ADD COLUMN IF NOT EXISTS welcome_message TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#1A7D5A';

-- ── 2. hotel_activities ────────────────────────────────────

CREATE TABLE IF NOT EXISTS hotel_activities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id        UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    category        TEXT CHECK (category IN (
                        'wellness', 'gastro', 'transport', 'adventure',
                        'culture', 'sport', 'family', 'other'
                    )),
    price           NUMERIC(10,2),
    duration_minutes INTEGER,
    image_url       TEXT,
    is_active       BOOLEAN DEFAULT true,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hotel_activities_hotel_id
    ON hotel_activities(hotel_id);

ALTER TABLE hotel_activities ENABLE ROW LEVEL SECURITY;

-- Platform admins: full access
CREATE POLICY "hotel_activities_admin_all" ON hotel_activities
    FOR ALL USING (is_platform_admin());

-- Hotel users: read/write own hotel's activities
CREATE POLICY "hotel_activities_hotel_user_select" ON hotel_activities
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM hotel_users hu
            WHERE hu.user_id = auth.uid()
              AND hu.hotel_id = hotel_activities.hotel_id
        )
    );

CREATE POLICY "hotel_activities_hotel_user_insert" ON hotel_activities
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM hotel_users hu
            WHERE hu.user_id = auth.uid()
              AND hu.hotel_id = hotel_activities.hotel_id
              AND hu.role = 'admin'
        )
    );

CREATE POLICY "hotel_activities_hotel_user_update" ON hotel_activities
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM hotel_users hu
            WHERE hu.user_id = auth.uid()
              AND hu.hotel_id = hotel_activities.hotel_id
              AND hu.role = 'admin'
        )
    );

CREATE POLICY "hotel_activities_hotel_user_delete" ON hotel_activities
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM hotel_users hu
            WHERE hu.user_id = auth.uid()
              AND hu.hotel_id = hotel_activities.hotel_id
              AND hu.role = 'admin'
        )
    );

-- Public read for active activities (guests can see them on hotel page)
CREATE POLICY "hotel_activities_public_read" ON hotel_activities
    FOR SELECT TO anon
    USING (
        is_active = true
        AND EXISTS (SELECT 1 FROM hotels h WHERE h.id = hotel_activities.hotel_id AND h.is_active = true)
    );

-- ── 3. hotel_rooms ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hotel_rooms (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id        UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_number     TEXT NOT NULL,
    floor           TEXT,
    qr_code_url     TEXT,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(hotel_id, room_number)
);

CREATE INDEX IF NOT EXISTS idx_hotel_rooms_hotel_id
    ON hotel_rooms(hotel_id);

ALTER TABLE hotel_rooms ENABLE ROW LEVEL SECURITY;

-- Platform admins: full access
CREATE POLICY "hotel_rooms_admin_all" ON hotel_rooms
    FOR ALL USING (is_platform_admin());

-- Hotel users: read/write own hotel's rooms
CREATE POLICY "hotel_rooms_hotel_user_select" ON hotel_rooms
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM hotel_users hu
            WHERE hu.user_id = auth.uid()
              AND hu.hotel_id = hotel_rooms.hotel_id
        )
    );

CREATE POLICY "hotel_rooms_hotel_user_insert" ON hotel_rooms
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM hotel_users hu
            WHERE hu.user_id = auth.uid()
              AND hu.hotel_id = hotel_rooms.hotel_id
              AND hu.role = 'admin'
        )
    );

CREATE POLICY "hotel_rooms_hotel_user_update" ON hotel_rooms
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM hotel_users hu
            WHERE hu.user_id = auth.uid()
              AND hu.hotel_id = hotel_rooms.hotel_id
              AND hu.role = 'admin'
        )
    );

CREATE POLICY "hotel_rooms_hotel_user_delete" ON hotel_rooms
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM hotel_users hu
            WHERE hu.user_id = auth.uid()
              AND hu.hotel_id = hotel_rooms.hotel_id
              AND hu.role = 'admin'
        )
    );

-- ── 4. RPC: get hotel dashboard data ───────────────────────

CREATE OR REPLACE FUNCTION get_hotel_dashboard(p_hotel_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Verify caller has access to this hotel
    IF NOT (
        is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM hotel_users
            WHERE user_id = auth.uid() AND hotel_id = p_hotel_id
        )
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT json_build_object(
        'hotel', (
            SELECT row_to_json(h.*)
            FROM hotels h WHERE h.id = p_hotel_id
        ),
        'activity_count', (
            SELECT COUNT(*) FROM hotel_activities
            WHERE hotel_id = p_hotel_id AND is_active = true
        ),
        'room_count', (
            SELECT COUNT(*) FROM hotel_rooms
            WHERE hotel_id = p_hotel_id AND is_active = true
        ),
        'provider_count', (
            SELECT COUNT(*) FROM hotel_providers
            WHERE hotel_id = p_hotel_id AND is_active = true
        ),
        'recent_bookings', (
            SELECT COALESCE(json_agg(row_to_json(b.*)), '[]'::json)
            FROM (
                SELECT id, booking_number, guest_name, guest_email,
                       start_date, end_date, total_price, status,
                       platform_commission, created_at
                FROM bookings
                WHERE hotel_id = p_hotel_id
                ORDER BY created_at DESC
                LIMIT 20
            ) b
        ),
        'stats', json_build_object(
            'total_bookings', (
                SELECT COUNT(*) FROM bookings WHERE hotel_id = p_hotel_id
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

GRANT EXECUTE ON FUNCTION get_hotel_dashboard(UUID) TO authenticated;

-- ── Verify ─────────────────────────────────────────────────
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'hotel_activities' ORDER BY ordinal_position;
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'hotel_rooms' ORDER BY ordinal_position;
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'hotels' AND column_name IN ('welcome_message','logo_url','theme_color');
