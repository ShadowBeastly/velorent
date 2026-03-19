-- ============================================================
-- 008_demo_account.sql
-- RentCore Demo Account Setup
--
-- Erstellt eine Demo-Organisation mit realistischen Testdaten
-- (Fahrräder, Kunden, Buchungen) für Sales-Demos.
--
-- NACH dieser Migration:
-- 1. Demo-User in Supabase Dashboard anlegen:
--    Authentication → Users → Add User
--    Email:    demo@rentcore.de  (oder NEXT_PUBLIC_DEMO_EMAIL)
--    Password: (aus NEXT_PUBLIC_DEMO_PASSWORD)
-- 2. User-UUID aus dem Dashboard kopieren
-- 3. Ausführen: SELECT link_demo_user('<uuid>');
-- ============================================================

BEGIN;

-- ── Demo Organisation ────────────────────────────────────────
INSERT INTO organizations (
    id, name, slug, address, city, postal_code, phone, email,
    website, description, settings
) VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'Stadtrad Demo GmbH',
    'stadtrad-demo',
    'Mainzer Landstraße 100',
    'Frankfurt am Main',
    '60327',
    '+49 69 900000',
    'demo@rentcore.de',
    'https://rentcore.de',
    'Demo-Account. Fahrrad- und E-Bike-Verleih im Herzen Frankfurts.',
    '{"demo": true}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- ── Demo Fahrräder ───────────────────────────────────────────
INSERT INTO bikes (id, organization_id, name, category, brand, model, price_per_day, price_per_week, deposit, status, description, battery, year, color) VALUES
('d1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
 'Cube Touring Hybrid ONE 625', 'E-Bike', 'Cube', 'Touring Hybrid ONE 625',
 45.00, 250.00, 150, 'available',
 'Komfortables Touren-E-Bike mit 625Wh Akku. Reichweite bis 120 km. Ideal für Stadttouren und längere Ausflüge.',
 '625Wh', 2024, 'Schwarz'),

('d1000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001',
 'Trek Marlin 7', 'Mountainbike', 'Trek', 'Marlin 7',
 30.00, 165.00, 100, 'available',
 'Robustes Hardtail-MTB für Waldwege und leichtes Gelände. Shimano Deore Schaltung.',
 NULL, 2023, 'Mattschwarz'),

('d1000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001',
 'Gazelle CityGo C7', 'City-Bike', 'Gazelle', 'CityGo C7',
 20.00, 110.00, 80, 'available',
 'Klassisches Stadtrad mit 7-Gang Nabenschaltung, Lichtanlage und Gepäckträger.',
 NULL, 2024, 'Weiß'),

('d1000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001',
 'Riese & Müller Load 75', 'Lastenrad', 'Riese & Müller', 'Load 75',
 65.00, 360.00, 250, 'available',
 'Elektrisches Lastenrad mit Bosch Performance CX. Ideal für Familien oder Großeinkäufe.',
 '500Wh', 2024, 'Dunkelgrün'),

('d1000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001',
 'Haibike AllMtn 6', 'E-MTB', 'Haibike', 'AllMtn 6',
 65.00, 360.00, 250, 'available',
 'Vollgefedertes E-Mountainbike mit Yamaha PW-X3 Motor. Für anspruchsvolle Trails.',
 '630Wh', 2023, 'Blau/Schwarz'),

('d1000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000001',
 'Giant Explore E+ 1', 'E-Bike', 'Giant', 'Explore E+ 1',
 50.00, 275.00, 150, 'rented',
 'Vielseitiges E-Trekkingrad für lange Touren. SyncDrive Sport Motor.',
 '500Wh', 2024, 'Silber'),

('d1000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000001',
 'Specialized Turbo Como 4.0', 'E-Bike', 'Specialized', 'Turbo Como 4.0',
 55.00, 300.00, 200, 'maintenance',
 'Komfort-E-Bike mit integrierter Smartphone-Verbindung und automatischer Gangschaltung.',
 '460Wh', 2023, 'Weiß/Beige')
ON CONFLICT (id) DO NOTHING;

-- ── Demo Kunden ──────────────────────────────────────────────
INSERT INTO customers (id, organization_id, first_name, last_name, email, phone, city, postal_code, total_bookings, total_revenue, last_booking_at) VALUES
('d2000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
 'Maria', 'Schneider', 'maria.schneider@example.de', '+49 170 1234567',
 'Frankfurt am Main', '60311', 4, 310.00, NOW() - INTERVAL '5 days'),

('d2000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001',
 'Thomas', 'Bauer', 'thomas.bauer@example.de', '+49 151 9876543',
 'Wiesbaden', '65183', 2, 180.00, NOW() - INTERVAL '12 days'),

('d2000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001',
 'Lena', 'Fischer', 'lena.fischer@example.de', '+49 176 5551234',
 'Darmstadt', '64283', 3, 240.00, NOW() - INTERVAL '3 days'),

('d2000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001',
 'Stefan', 'Hoffmann', 'stefan.hoffmann@example.de', '+49 160 3334444',
 'Mainz', '55116', 1, 65.00, NOW() - INTERVAL '20 days'),

('d2000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001',
 'Anna', 'Weber', 'anna.weber@example.de', '+49 162 7778888',
 'Frankfurt am Main', '60594', 6, 520.00, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- ── Demo Buchungen ───────────────────────────────────────────
-- Mix aus: returned (abgeschlossen), confirmed (aktiv), reserved (zukünftig)

INSERT INTO bookings (
    id, organization_id, booking_number,
    bike_id, customer_id,
    customer_name, customer_email, customer_phone,
    start_date, end_date,
    price_per_day, total_days, subtotal, total_price, deposit_amount, deposit_paid,
    payment_status, payment_method, paid_amount,
    status, source
) VALUES

-- ── Abgeschlossene Buchungen (letzte 90 Tage) ──
('d3000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'RC-2026-001',
 'd1000000-0000-0000-0000-000000000003', 'd2000000-0000-0000-0000-000000000001',
 'Maria Schneider', 'maria.schneider@example.de', '+49 170 1234567',
 CURRENT_DATE - 85, CURRENT_DATE - 83,
 20.00, 3, 60.00, 60.00, 80.00, true,
 'paid', 'card', 60.00, 'returned', 'website'),

('d3000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'RC-2026-002',
 'd1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000005',
 'Anna Weber', 'anna.weber@example.de', '+49 162 7778888',
 CURRENT_DATE - 78, CURRENT_DATE - 75,
 45.00, 4, 180.00, 180.00, 150.00, true,
 'paid', 'card', 180.00, 'returned', 'manual'),

('d3000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'RC-2026-003',
 'd1000000-0000-0000-0000-000000000002', 'd2000000-0000-0000-0000-000000000002',
 'Thomas Bauer', 'thomas.bauer@example.de', '+49 151 9876543',
 CURRENT_DATE - 65, CURRENT_DATE - 63,
 30.00, 3, 90.00, 90.00, 100.00, true,
 'paid', 'cash', 90.00, 'returned', 'manual'),

('d3000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'RC-2026-004',
 'd1000000-0000-0000-0000-000000000004', 'd2000000-0000-0000-0000-000000000005',
 'Anna Weber', 'anna.weber@example.de', '+49 162 7778888',
 CURRENT_DATE - 55, CURRENT_DATE - 53,
 65.00, 3, 195.00, 195.00, 250.00, true,
 'paid', 'card', 195.00, 'returned', 'website'),

('d3000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'RC-2026-005',
 'd1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000003',
 'Lena Fischer', 'lena.fischer@example.de', '+49 176 5551234',
 CURRENT_DATE - 45, CURRENT_DATE - 42,
 45.00, 4, 180.00, 180.00, 150.00, true,
 'paid', 'card', 180.00, 'returned', 'website'),

('d3000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000001', 'RC-2026-006',
 'd1000000-0000-0000-0000-000000000003', 'd2000000-0000-0000-0000-000000000001',
 'Maria Schneider', 'maria.schneider@example.de', '+49 170 1234567',
 CURRENT_DATE - 35, CURRENT_DATE - 33,
 20.00, 3, 60.00, 60.00, 80.00, true,
 'paid', 'card', 60.00, 'returned', 'website'),

('d3000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000001', 'RC-2026-007',
 'd1000000-0000-0000-0000-000000000005', 'd2000000-0000-0000-0000-000000000004',
 'Stefan Hoffmann', 'stefan.hoffmann@example.de', '+49 160 3334444',
 CURRENT_DATE - 25, CURRENT_DATE - 22,
 65.00, 4, 260.00, 260.00, 250.00, true,
 'paid', 'transfer', 260.00, 'returned', 'manual'),

('d3000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000001', 'RC-2026-008',
 'd1000000-0000-0000-0000-000000000002', 'd2000000-0000-0000-0000-000000000003',
 'Lena Fischer', 'lena.fischer@example.de', '+49 176 5551234',
 CURRENT_DATE - 18, CURRENT_DATE - 16,
 30.00, 3, 90.00, 90.00, 100.00, true,
 'paid', 'card', 90.00, 'returned', 'website'),

-- ── Aktive Buchungen (heute / laufende Woche) ──
('d3000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000001', 'RC-2026-009',
 'd1000000-0000-0000-0000-000000000006', 'd2000000-0000-0000-0000-000000000005',
 'Anna Weber', 'anna.weber@example.de', '+49 162 7778888',
 CURRENT_DATE - 1, CURRENT_DATE + 2,
 50.00, 4, 200.00, 200.00, 150.00, true,
 'paid', 'card', 200.00, 'picked_up', 'website'),

('d3000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000001', 'RC-2026-010',
 'd1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001',
 'Maria Schneider', 'maria.schneider@example.de', '+49 170 1234567',
 CURRENT_DATE, CURRENT_DATE + 3,
 45.00, 4, 180.00, 180.00, 150.00, true,
 'paid', 'card', 180.00, 'confirmed', 'website'),

-- ── Zukünftige Buchungen ──
('d3000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000001', 'RC-2026-011',
 'd1000000-0000-0000-0000-000000000004', 'd2000000-0000-0000-0000-000000000002',
 'Thomas Bauer', 'thomas.bauer@example.de', '+49 151 9876543',
 CURRENT_DATE + 5, CURRENT_DATE + 7,
 65.00, 3, 195.00, 195.00, 250.00, false,
 'pending', 'card', 0.00, 'reserved', 'website'),

('d3000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000001', 'RC-2026-012',
 'd1000000-0000-0000-0000-000000000003', 'd2000000-0000-0000-0000-000000000003',
 'Lena Fischer', 'lena.fischer@example.de', '+49 176 5551234',
 CURRENT_DATE + 8, CURRENT_DATE + 10,
 20.00, 3, 60.00, 60.00, 80.00, false,
 'pending', NULL, 0.00, 'reserved', 'manual'),

('d3000000-0000-0000-0000-000000000013', 'd0000000-0000-0000-0000-000000000001', 'RC-2026-013',
 'd1000000-0000-0000-0000-000000000005', 'd2000000-0000-0000-0000-000000000005',
 'Anna Weber', 'anna.weber@example.de', '+49 162 7778888',
 CURRENT_DATE + 14, CURRENT_DATE + 17,
 65.00, 4, 260.00, 260.00, 250.00, false,
 'pending', NULL, 0.00, 'reserved', 'website')

ON CONFLICT (id) DO NOTHING;

-- ── Helper: Demo-User mit Demo-Org verknüpfen ────────────────
-- Ausführen mit: SELECT link_demo_user('<user-uuid>');
CREATE OR REPLACE FUNCTION link_demo_user(user_uuid UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Profil-Name setzen
    UPDATE profiles
    SET full_name = COALESCE(NULLIF(full_name, ''), 'Demo Account')
    WHERE id = user_uuid;

    -- Als Org-Owner verknüpfen
    INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
    VALUES ('d0000000-0000-0000-0000-000000000001', user_uuid, 'owner', 'active', now())
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'owner', status = 'active';

    RETURN format(
        'Demo-User %s erfolgreich verknüpft. localStorage: currentOrgId = d0000000-0000-0000-0000-000000000001',
        user_uuid
    );
END;
$$;

COMMIT;

-- ============================================================
-- EINRICHTUNG ZUSAMMENFASSUNG
-- ============================================================
-- 1. Migration ausführen (diese Datei)
-- 2. In Supabase Dashboard → Authentication → Users → "Add User"
--    Email:    demo@rentcore.de
--    Password: (aus .env: NEXT_PUBLIC_DEMO_PASSWORD)
--    ✓ "Auto Confirm User" aktivieren
-- 3. UUID des neuen Users kopieren
-- 4. In Supabase SQL Editor ausführen:
--    SELECT link_demo_user('<uuid-hier-einfügen>');
-- 5. .env.local ergänzen:
--    NEXT_PUBLIC_DEMO_EMAIL=demo@rentcore.de
--    NEXT_PUBLIC_DEMO_PASSWORD=<gewähltes-passwort>
-- ============================================================
