-- =====================================================
-- RentCore — Group / Multi-Bike Booking Support
-- Run ONCE in Supabase SQL Editor after missing-tables.sql
-- Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- =====================================================

-- =====================================================
-- booking_items — one row per additional bike in a group booking
-- (the first / primary bike stays on bookings.bike_id for backward compat)
-- =====================================================
CREATE TABLE IF NOT EXISTS booking_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
    bike_id UUID REFERENCES bikes(id) ON DELETE SET NULL,
    price_per_day DECIMAL(10,2),
    subtotal DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_bike    ON booking_items(bike_id);

ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can manage booking_items" ON booking_items;
CREATE POLICY "Members can manage booking_items" ON booking_items
FOR ALL USING (
    booking_id IN (
        SELECT id FROM bookings
        WHERE organization_id IN (SELECT get_user_org_ids())
    )
);

-- =====================================================
-- Extend bookings table with group-booking metadata
-- =====================================================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_group_booking BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS bike_count INTEGER DEFAULT 1;
