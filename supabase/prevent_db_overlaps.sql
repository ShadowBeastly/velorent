-- Enable btree_gist extension for mixing scalar and range types in constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add exclusion constraint to bookings table (idempotent)
-- This ensures that for a given bike_id, no two rows have overlapping start_date/end_date ranges
-- ONLY verifies this if the status is NOT 'cancelled'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_bookings'
    ) THEN
        ALTER TABLE bookings
        ADD CONSTRAINT no_overlapping_bookings
        EXCLUDE USING gist (
            bike_id WITH =,
            daterange(start_date, end_date, '[]') WITH &&
        )
        WHERE (status != 'cancelled');
    END IF;
END $$;
