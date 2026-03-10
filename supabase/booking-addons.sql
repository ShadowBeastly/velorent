-- =====================================================
-- RentCore — Booking Add-Ons Junction Table
-- Run in Supabase SQL Editor after missing-tables.sql
-- Safe to re-run (IF NOT EXISTS).
-- =====================================================

-- booking_addons — one row per selected add-on per booking
CREATE TABLE IF NOT EXISTS booking_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
    addon_id UUID REFERENCES add_ons(id) ON DELETE SET NULL,
    addon_name TEXT NOT NULL,
    price_type TEXT DEFAULT 'per_day', -- per_day, flat, per_booking
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_addons_booking ON booking_addons(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_addons_addon ON booking_addons(addon_id);

ALTER TABLE booking_addons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can manage booking_addons" ON booking_addons;
CREATE POLICY "Members can manage booking_addons" ON booking_addons
FOR ALL USING (
    booking_id IN (
        SELECT id FROM bookings
        WHERE organization_id IN (SELECT get_user_org_ids())
    )
);
