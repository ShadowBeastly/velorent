-- =====================================================
-- VeloRent Pro — PUBLIC BOOKING WIDGET API
-- Run this in Supabase SQL Editor after supabase-schema.sql
-- Provides an anon-accessible RPC for the booking widget.
-- =====================================================

-- =====================================================
-- create_public_booking
-- Called by the public booking widget (anon key).
-- Returns the new booking id and booking_number.
-- =====================================================
CREATE OR REPLACE FUNCTION create_public_booking(
    p_organization_id   UUID,
    p_bike_id           UUID,
    p_start_date        DATE,
    p_end_date          DATE,
    p_customer_name     TEXT,
    p_customer_email    TEXT,
    p_customer_phone    TEXT  DEFAULT NULL,
    p_notes             TEXT  DEFAULT NULL,
    p_total_price       DECIMAL(10,2) DEFAULT 0,
    p_total_days        INTEGER DEFAULT 1
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_id        UUID;
    v_booking_number    TEXT;
    v_customer_id       UUID;
    v_recent_count      INTEGER;
BEGIN
    -- ── Rate limiting ──────────────────────────────────────────────────────────
    -- Count bookings with the same email created in the last hour.
    -- Limit to 5 to prevent spam from the public widget.
    SELECT COUNT(*) INTO v_recent_count
    FROM bookings
    WHERE customer_email = p_customer_email
      AND organization_id = p_organization_id
      AND created_at > NOW() - INTERVAL '1 hour';

    IF v_recent_count >= 5 THEN
        RAISE EXCEPTION 'Zu viele Buchungen. Bitte versuchen Sie es später erneut.';
    END IF;

    -- ── Upsert customer ───────────────────────────────────────────────────────
    INSERT INTO customers (organization_id, name, email, phone)
    VALUES (p_organization_id, p_customer_name, p_customer_email, p_customer_phone)
    ON CONFLICT (organization_id, email) DO UPDATE
        SET name  = EXCLUDED.name,
            phone = COALESCE(EXCLUDED.phone, customers.phone)
    RETURNING id INTO v_customer_id;

    -- ── Generate booking number ───────────────────────────────────────────────
    v_booking_number := 'BK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                        LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

    -- ── Insert booking ────────────────────────────────────────────────────────
    INSERT INTO bookings (
        organization_id, bike_id, customer_id,
        customer_name, customer_email, customer_phone,
        start_date, end_date,
        total_days, total_price,
        status, notes, booking_number
    ) VALUES (
        p_organization_id, p_bike_id, v_customer_id,
        p_customer_name, p_customer_email, p_customer_phone,
        p_start_date, p_end_date,
        p_total_days, p_total_price,
        'pending', p_notes, v_booking_number
    )
    RETURNING id INTO v_booking_id;

    RETURN json_build_object(
        'booking_id',     v_booking_id,
        'booking_number', v_booking_number
    );
END;
$$;

-- Allow anonymous callers (the booking widget uses the anon key)
GRANT EXECUTE ON FUNCTION create_public_booking(
    UUID, UUID, DATE, DATE, TEXT, TEXT, TEXT, TEXT, DECIMAL(10,2), INTEGER
) TO anon;
