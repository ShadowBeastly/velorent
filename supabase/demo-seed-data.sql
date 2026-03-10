-- =====================================================
-- RENTCORE - DEMO SEED DATA
-- =====================================================
-- Erstellt einen Demo-Account mit realistischen Daten
-- zum Testen und für Demos an potenzielle Kunden.
--
-- WICHTIG: Erst NACH den anderen SQL-Dateien ausführen!
-- =====================================================

-- Demo Organisation erstellen
INSERT INTO organizations (
  id, 
  name, 
  slug, 
  address, 
  city, 
  phone, 
  email, 
  settings, 
  subscription_tier, 
  subscription_status
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Hotel Seeblick - Demo',
  'demo',
  'Am Seeufer 15',
  '83684 Tegernsee',
  '+49 8022 12345',
  'demo@rentcore.de',
  '{"currency": "EUR", "timezone": "Europe/Berlin", "language": "de"}',
  'pro',
  'active'
) ON CONFLICT (slug) DO NOTHING;

-- Demo Bikes (realistische Flotte)
INSERT INTO bikes (organization_id, name, description, category, brand, model, size, color, frame_number, price_per_day, price_per_week, deposit, battery, motor, status, image_url) VALUES
('11111111-1111-1111-1111-111111111111', 'City E-Bike "Moritz"', 'Komfortables Stadtrad mit tiefem Einstieg, perfekt für entspannte Touren am See.', 'e-bike', 'Cube', 'Town Sport Hybrid', 'M', 'Schwarz', 'WTU-2023-001', 35.00, 200.00, 100.00, '500 Wh', 'Bosch Active Plus', 'available', NULL),
('11111111-1111-1111-1111-111111111111', 'City E-Bike "Emma"', 'Elegantes Damen-E-Bike mit Korb, ideal zum Einkaufen und für Stadtfahrten.', 'e-bike', 'Cube', 'Ella Ride Hybrid', 'S', 'Weiß', 'WTU-2023-002', 35.00, 200.00, 100.00, '400 Wh', 'Bosch Active', 'available', NULL),
('11111111-1111-1111-1111-111111111111', 'Trekking E-Bike "Alpen"', 'Sportliches Trekking-Rad für längere Touren in die Berge.', 'e-bike', 'Haibike', 'Trekking 5', 'L', 'Grün', 'WTU-2023-003', 45.00, 250.00, 150.00, '625 Wh', 'Bosch Performance CX', 'available', NULL),
('11111111-1111-1111-1111-111111111111', 'MTB E-Bike "Trail"', 'Vollgefedertes E-Mountainbike für anspruchsvolle Trails.', 'e-mtb', 'Specialized', 'Turbo Levo', 'L', 'Orange', 'WTU-2023-004', 65.00, 350.00, 200.00, '700 Wh', 'Specialized 2.1', 'available', NULL),
('11111111-1111-1111-1111-111111111111', 'Kinder E-Bike "Junior"', 'Sicheres E-Bike für Kinder ab 10 Jahren mit limitierter Geschwindigkeit.', 'e-bike', 'Woom', 'UP 5', 'XS', 'Rot', 'WTU-2023-005', 25.00, 150.00, 80.00, '250 Wh', 'Fazua Mini', 'available', NULL),
('11111111-1111-1111-1111-111111111111', 'Stadtrad "Classic"', 'Robustes Stadtrad ohne Motor, 7-Gang-Nabenschaltung.', 'city', 'Gazelle', 'Orange C7+', 'M', 'Blau', 'WTU-2023-006', 15.00, 85.00, 50.00, NULL, NULL, 'available', NULL),
('11111111-1111-1111-1111-111111111111', 'Lastenrad "Cargo"', 'Dreirad-Lastenrad für Familien oder Einkäufe, mit Kindersitzen.', 'cargo', 'Babboe', 'Big-E', 'Einheitsgröße', 'Holz/Schwarz', 'WTU-2023-007', 55.00, 300.00, 150.00, '500 Wh', 'Yamaha', 'available', NULL),
('11111111-1111-1111-1111-111111111111', 'Tandem "Partner"', 'Klassisches Tandem für zwei Personen, ideal für Paare.', 'tandem', 'KHS', 'Milano Tandem', 'L', 'Silber', 'WTU-2023-008', 40.00, 220.00, 100.00, NULL, NULL, 'available', NULL),
('11111111-1111-1111-1111-111111111111', 'Kinderrad "Mini" (20")', 'Kinderrad für 6-8 Jährige, mit Stützrädern verfügbar.', 'kids', 'Puky', 'Skyride 20-3', '20 Zoll', 'Pink', 'WTU-2023-009', 10.00, 55.00, 30.00, NULL, NULL, 'available', NULL),
('11111111-1111-1111-1111-111111111111', 'Rennrad "Speed"', 'Leichtes Rennrad für sportliche Fahrer, Carbon-Rahmen.', 'road', 'Canyon', 'Endurace CF', 'M', 'Schwarz/Rot', 'WTU-2023-010', 45.00, 250.00, 200.00, NULL, NULL, 'maintenance', NULL)
ON CONFLICT DO NOTHING;

-- Demo Kunden
INSERT INTO customers (organization_id, first_name, last_name, email, phone, address, city, postal_code, country, total_bookings, total_revenue) VALUES
('11111111-1111-1111-1111-111111111111', 'Max', 'Mustermann', 'max@example.com', '+49 171 1234567', 'Musterstr. 1', 'München', '80331', 'DE', 3, 420.00),
('11111111-1111-1111-1111-111111111111', 'Anna', 'Schmidt', 'anna.schmidt@example.com', '+49 172 2345678', 'Seeweg 12', 'Hamburg', '20095', 'DE', 2, 280.00),
('11111111-1111-1111-1111-111111111111', 'Thomas', 'Weber', 'weber.t@example.com', '+49 173 3456789', 'Bergstr. 5', 'Stuttgart', '70173', 'DE', 5, 890.00),
('11111111-1111-1111-1111-111111111111', 'Sarah', 'Meier', 'sarah.m@example.com', '+49 174 4567890', 'Hauptplatz 3', 'Wien', '1010', 'AT', 1, 105.00),
('11111111-1111-1111-1111-111111111111', 'Familie', 'Bauer', 'familie.bauer@example.com', '+49 175 5678901', 'Familienweg 8', 'Salzburg', '5020', 'AT', 4, 650.00)
ON CONFLICT DO NOTHING;

-- Demo Buchungen (vergangene, aktuelle, zukünftige)
DO $$
DECLARE
  bike_city_id UUID;
  bike_trekking_id UUID;
  bike_cargo_id UUID;
  bike_mtb_id UUID;
  customer_max_id UUID;
  customer_anna_id UUID;
  customer_thomas_id UUID;
  customer_familie_id UUID;
BEGIN
  -- Bike IDs holen
  SELECT id INTO bike_city_id FROM bikes WHERE name = 'City E-Bike "Moritz"' AND organization_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;
  SELECT id INTO bike_trekking_id FROM bikes WHERE name = 'Trekking E-Bike "Alpen"' AND organization_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;
  SELECT id INTO bike_cargo_id FROM bikes WHERE name = 'Lastenrad "Cargo"' AND organization_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;
  SELECT id INTO bike_mtb_id FROM bikes WHERE name = 'MTB E-Bike "Trail"' AND organization_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;
  
  -- Customer IDs holen
  SELECT id INTO customer_max_id FROM customers WHERE email = 'max@example.com' LIMIT 1;
  SELECT id INTO customer_anna_id FROM customers WHERE email = 'anna.schmidt@example.com' LIMIT 1;
  SELECT id INTO customer_thomas_id FROM customers WHERE email = 'weber.t@example.com' LIMIT 1;
  SELECT id INTO customer_familie_id FROM customers WHERE email = 'familie.bauer@example.com' LIMIT 1;

  -- Vergangene Buchung (abgeschlossen)
  INSERT INTO bookings (
    organization_id, bike_id, customer_id, customer_name, customer_email, customer_phone,
    start_date, end_date, price_per_day, total_days, total_price, deposit_amount,
    status, payment_status, source, notes
  ) VALUES (
    '11111111-1111-1111-1111-111111111111',
    bike_city_id,
    customer_max_id,
    'Max Mustermann',
    'max@example.com',
    '+49 171 1234567',
    CURRENT_DATE - INTERVAL '14 days',
    CURRENT_DATE - INTERVAL '11 days',
    35.00,
    3,
    105.00,
    100.00,
    'returned',
    'paid',
    'manual',
    'Stammkunde, sehr zufrieden'
  ) ON CONFLICT DO NOTHING;

  -- Aktive Buchung (gerade unterwegs)
  INSERT INTO bookings (
    organization_id, bike_id, customer_id, customer_name, customer_email, customer_phone,
    start_date, end_date, price_per_day, total_days, total_price, deposit_amount,
    status, payment_status, source, notes
  ) VALUES (
    '11111111-1111-1111-1111-111111111111',
    bike_trekking_id,
    customer_thomas_id,
    'Thomas Weber',
    'weber.t@example.com',
    '+49 173 3456789',
    CURRENT_DATE - INTERVAL '2 days',
    CURRENT_DATE + INTERVAL '3 days',
    45.00,
    5,
    225.00,
    150.00,
    'picked_up',
    'paid',
    'website',
    'Macht eine Alpentour'
  ) ON CONFLICT DO NOTHING;

  -- Aktive Buchung 2
  INSERT INTO bookings (
    organization_id, bike_id, customer_id, customer_name, customer_email, customer_phone,
    start_date, end_date, price_per_day, total_days, total_price, deposit_amount,
    status, payment_status, source, notes
  ) VALUES (
    '11111111-1111-1111-1111-111111111111',
    bike_cargo_id,
    customer_familie_id,
    'Familie Bauer',
    'familie.bauer@example.com',
    '+49 175 5678901',
    CURRENT_DATE - INTERVAL '1 day',
    CURRENT_DATE + INTERVAL '2 days',
    55.00,
    3,
    165.00,
    150.00,
    'picked_up',
    'paid',
    'manual',
    '2 Kinder, extra Sitze montiert'
  ) ON CONFLICT DO NOTHING;

  -- Reservierung für morgen
  INSERT INTO bookings (
    organization_id, bike_id, customer_id, customer_name, customer_email, customer_phone,
    start_date, end_date, price_per_day, total_days, total_price, deposit_amount,
    status, payment_status, source, notes
  ) VALUES (
    '11111111-1111-1111-1111-111111111111',
    bike_mtb_id,
    customer_anna_id,
    'Anna Schmidt',
    'anna.schmidt@example.com',
    '+49 172 2345678',
    CURRENT_DATE + INTERVAL '1 day',
    CURRENT_DATE + INTERVAL '4 days',
    65.00,
    3,
    195.00,
    200.00,
    'confirmed',
    'pending',
    'website',
    'Möchte Trail-Tipps'
  ) ON CONFLICT DO NOTHING;

  -- Reservierung für nächste Woche
  INSERT INTO bookings (
    organization_id, bike_id, customer_id, customer_name, customer_email, customer_phone,
    start_date, end_date, price_per_day, total_days, total_price, deposit_amount,
    status, payment_status, source, notes
  ) VALUES (
    '11111111-1111-1111-1111-111111111111',
    bike_city_id,
    customer_max_id,
    'Max Mustermann',
    'max@example.com',
    '+49 171 1234567',
    CURRENT_DATE + INTERVAL '7 days',
    CURRENT_DATE + INTERVAL '14 days',
    35.00,
    7,
    200.00,  -- Wochenpreis
    100.00,
    'reserved',
    'pending',
    'manual',
    'Geburtstagsurlaub'
  ) ON CONFLICT DO NOTHING;

  -- Update Bike Status basierend auf aktiven Buchungen
  UPDATE bikes SET status = 'rented' 
  WHERE id IN (bike_trekking_id, bike_cargo_id) 
  AND organization_id = '11111111-1111-1111-1111-111111111111';

END $$;

-- Demo Widget Settings
INSERT INTO public_booking_settings (
  organization_id,
  is_enabled,
  public_api_key,
  primary_color,
  secondary_color,
  border_radius,
  min_days,
  max_days,
  min_advance_hours,
  max_advance_days,
  require_email,
  require_phone,
  require_address,
  auto_confirm,
  welcome_text,
  success_text
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  true,
  'demo_pk_' || encode(gen_random_bytes(16), 'hex'),
  '#f97316',
  '#fbbf24',
  12,
  1,
  30,
  24,
  90,
  true,
  true,
  false,
  true,
  'Willkommen beim Fahrradverleih Hotel Seeblick! Buchen Sie bequem online.',
  'Vielen Dank für Ihre Buchung! Wir freuen uns auf Ihren Besuch.'
) ON CONFLICT DO NOTHING;

-- Demo Maintenance Log
INSERT INTO maintenance_logs (organization_id, bike_id, type, description, cost, performed_at, status)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  id,
  'service',
  'Jahresinspektion: Bremsen geprüft, Kette geschmiert, Reifendruck kontrolliert',
  45.00,
  CURRENT_DATE - INTERVAL '30 days',
  'completed'
FROM bikes 
WHERE name = 'City E-Bike "Moritz"' 
AND organization_id = '11111111-1111-1111-1111-111111111111'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Demo Location
INSERT INTO locations (organization_id, name, address, city, postal_code, phone, is_default, opening_hours) VALUES
('11111111-1111-1111-1111-111111111111', 'Hauptstandort Rezeption', 'Am Seeufer 15', 'Tegernsee', '83684', '+49 8022 12345', true, 
 '{"monday": "08:00-18:00", "tuesday": "08:00-18:00", "wednesday": "08:00-18:00", "thursday": "08:00-18:00", "friday": "08:00-20:00", "saturday": "09:00-17:00", "sunday": "10:00-16:00"}'
)
ON CONFLICT DO NOTHING;

-- Ausgabe
SELECT 'Demo-Daten erfolgreich erstellt!' AS status;
SELECT 
  (SELECT COUNT(*) FROM bikes WHERE organization_id = '11111111-1111-1111-1111-111111111111') AS bikes,
  (SELECT COUNT(*) FROM customers WHERE organization_id = '11111111-1111-1111-1111-111111111111') AS customers,
  (SELECT COUNT(*) FROM bookings WHERE organization_id = '11111111-1111-1111-1111-111111111111') AS bookings;
