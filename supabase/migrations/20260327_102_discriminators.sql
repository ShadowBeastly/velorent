-- Migration: Add discriminator columns for generic item/venue types
-- Rollback: ALTER TABLE bikes DROP COLUMN IF EXISTS item_type, DROP COLUMN IF EXISTS item_subtype, DROP COLUMN IF EXISTS capacity, DROP COLUMN IF EXISTS location_type; ALTER TABLE hotels DROP COLUMN IF EXISTS venue_type, DROP COLUMN IF EXISTS is_self_managed;
-- Dependencies: none

BEGIN;

-- === bikes: discriminator columns ===

ALTER TABLE bikes
  ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'rental'
    CHECK (item_type IN ('rental', 'experience', 'food_beverage', 'service')),
  ADD COLUMN IF NOT EXISTS item_subtype TEXT,
  ADD COLUMN IF NOT EXISTS capacity INTEGER,
  ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'pickup'
    CHECK (location_type IN ('pickup', 'onsite', 'mobile', 'virtual'));

-- Backfill item_type based on existing categories
UPDATE bikes SET item_type = 'experience'
WHERE category IN ('Canoe', 'SUP', 'Go-Kart', 'Climbing', 'Escape Room', 'Guided Tour', 'Hot Air Balloon', 'Sailing');

UPDATE bikes SET item_type = 'food_beverage'
WHERE category IN ('Wine Tasting');

UPDATE bikes SET item_type = 'service'
WHERE category IN ('Wellness', 'Spa');

-- Everything else stays 'rental' (E-Bike, Mountainbike, City-Bike, Trekking, E-MTB, Lastenrad)

-- === hotels: discriminator columns ===

ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS venue_type TEXT DEFAULT 'hotel'
    CHECK (venue_type IN ('hotel', 'airbnb', 'ferienwohnung', 'campingplatz', 'hostel', 'other')),
  ADD COLUMN IF NOT EXISTS is_self_managed BOOLEAN DEFAULT false;

NOTIFY pgrst, 'reload schema';

COMMIT;
