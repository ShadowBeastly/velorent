-- ============================================================
-- seed-testdata.sql
-- Testdaten für Lociva: Region, Hotel, Provider, Bikes
-- ============================================================

BEGIN;

-- Fix: organizations table missing updated_at → add it so trigger works
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 1. Region: Rhein-Main
INSERT INTO regions (id, name)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Rhein-Main')
ON CONFLICT DO NOTHING;

-- 2. Update existing Flemings Hotel with region + full data
UPDATE hotels SET
  address = 'Mainzer Landstraße 49, 60329 Frankfurt am Main',
  latitude = 50.1070,
  longitude = 8.6530,
  contact_email = COALESCE(contact_email, 'concierge@example-hotel.de'),
  region_id = 'a0000000-0000-0000-0000-000000000001'
WHERE slug = 'flemings-ffm';

-- 3. Hotel: Steigenberger Bad Homburg
INSERT INTO hotels (id, name, slug, address, latitude, longitude, contact_email, contact_phone, commission_pct, region_id, is_active)
VALUES (
  'b0000000-0000-0000-0000-000000000002',
  'Steigenberger Hotel Bad Homburg',
  'steigenberger-hg',
  'Kaiser-Friedrich-Promenade 69, 61348 Bad Homburg',
  50.2271, 8.6180,
  'info@example-hotel-2.de',
  '+49 000 0000001',
  0,
  'a0000000-0000-0000-0000-000000000001',
  true
) ON CONFLICT (slug) DO NOTHING;

-- 4. Provider: Radhaus Niederrad
INSERT INTO organizations (id, name, slug, address, city, postal_code, phone, email,
  is_platform_provider, provider_description, provider_address, provider_phone)
SELECT
  'c0000000-0000-0000-0000-000000000001',
  'Radhaus Niederrad',
  'radhaus-niederrad',
  'Bruchfeldstraße 42, 60528 Frankfurt',
  'Frankfurt am Main', '60528',
  '+49 000 0000002',
  'info@example-bikeshop.de',
  true,
  'Familienbetrieb seit 2008. E-Bikes, City-Räder und Lastenräder — perfekt für Messe-Besucher und Tagesausflüge am Main.',
  'Bruchfeldstraße 42, 60528 Frankfurt am Main',
  '+49 000 0000002'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'radhaus-niederrad');

UPDATE organizations SET
  is_platform_provider = true,
  provider_description = 'Familienbetrieb seit 2008. E-Bikes, City-Räder und Lastenräder — perfekt für Messe-Besucher und Tagesausflüge am Main.',
  provider_address = 'Bruchfeldstraße 42, 60528 Frankfurt am Main',
  provider_phone = '+49 000 0000002'
WHERE slug = 'radhaus-niederrad';

-- 5. Provider: Taunus E-Bike Verleih
INSERT INTO organizations (id, name, slug, address, city, postal_code, phone, email,
  is_platform_provider, provider_description, provider_address, provider_phone)
SELECT
  'c0000000-0000-0000-0000-000000000002',
  'Taunus E-Bike Verleih',
  'taunus-ebike',
  'Louisenstraße 15, 61348 Bad Homburg',
  'Bad Homburg', '61348',
  '+49 000 0000003',
  'kontakt@example-ebike.de',
  true,
  'Premium E-Bikes für Taunus-Touren. Geführte Gruppenausflüge auf Anfrage.',
  'Louisenstraße 15, 61348 Bad Homburg',
  '+49 000 0000003'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'taunus-ebike');

UPDATE organizations SET
  is_platform_provider = true,
  provider_description = 'Premium E-Bikes für Taunus-Touren. Geführte Gruppenausflüge auf Anfrage.',
  provider_address = 'Louisenstraße 15, 61348 Bad Homburg',
  provider_phone = '+49 000 0000003'
WHERE slug = 'taunus-ebike';

-- 6. Hotel-Provider Verknüpfungen
INSERT INTO hotel_providers (hotel_id, organization_id, distance_km, is_active)
VALUES ((SELECT id FROM hotels WHERE slug = 'flemings-ffm'), 'c0000000-0000-0000-0000-000000000001', 1.2, true)
ON CONFLICT (hotel_id, organization_id) DO NOTHING;

INSERT INTO hotel_providers (hotel_id, organization_id, distance_km, is_active)
VALUES ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 0.6, true)
ON CONFLICT (hotel_id, organization_id) DO NOTHING;

INSERT INTO hotel_providers (hotel_id, organization_id, distance_km, is_active)
VALUES ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 12.5, true)
ON CONFLICT (hotel_id, organization_id) DO NOTHING;

-- 7. Bikes für Radhaus Niederrad
INSERT INTO bikes (organization_id, name, category, brand, model, price_per_day, deposit, status, description) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Cube Touring Hybrid ONE 625', 'E-Bike', 'Cube', 'Touring Hybrid ONE 625', 45.00, 150, 'available', 'Komfortables Touren-E-Bike mit 625Wh Akku. Reichweite bis 120km.'),
  ('c0000000-0000-0000-0000-000000000001', 'Trek Marlin 7', 'Mountainbike', 'Trek', 'Marlin 7', 30.00, 100, 'available', 'Robustes Hardtail-MTB für Waldwege und leichtes Gelände.'),
  ('c0000000-0000-0000-0000-000000000001', 'Gazelle CityGo C7', 'City-Bike', 'Gazelle', 'CityGo C7', 20.00, 80, 'available', 'Klassisches Stadtrad mit 7-Gang Nabenschaltung und Lichtanlage.'),
  ('c0000000-0000-0000-0000-000000000001', 'Riese & Müller Load 75', 'Lastenrad', 'Riese & Müller', 'Load 75', 55.00, 200, 'available', 'Elektrisches Lastenrad — ideal für Familien oder Großeinkäufe.');

-- 8. Bikes für Taunus E-Bike Verleih
INSERT INTO bikes (organization_id, name, category, brand, model, price_per_day, deposit, status, description) VALUES
  ('c0000000-0000-0000-0000-000000000002', 'Haibike AllMtn 6', 'E-MTB', 'Haibike', 'AllMtn 6', 65.00, 250, 'available', 'Vollgefedertes E-Mountainbike für anspruchsvolle Taunus-Trails.'),
  ('c0000000-0000-0000-0000-000000000002', 'Giant Explore E+ 1', 'E-Bike', 'Giant', 'Explore E+ 1', 50.00, 150, 'available', 'Vielseitiges E-Trekkingrad für lange Touren durch den Taunus.'),
  ('c0000000-0000-0000-0000-000000000002', 'Scott Strike eRide 930', 'E-MTB', 'Scott', 'Strike eRide 930', 60.00, 200, 'available', 'Leichtes E-Fully mit modernem Bosch-Antrieb.');

COMMIT;

-- Test URLs:
--   /hotel/flemings-ffm     → 1 Provider, 4 Bikes
--   /hotel/steigenberger-hg → 2 Provider, 7 Bikes
