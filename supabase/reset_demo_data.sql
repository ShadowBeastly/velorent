-- =====================================================
-- VELORENT PRO - DEMO DATA RESET SCRIPT (V2)
-- =====================================================
-- ANLEITUNG:
-- 1. Öffnen Sie den SQL Editor in Ihrem Supabase Dashboard.
-- 2. Ersetzen Sie unten 'YOUR_ORG_ID_HERE' mit Ihrer echten Organization ID.
-- 3. Führen Sie das Skript aus.
-- =====================================================

DO $$
DECLARE
    -- !!! WICHTIG: HIER IHRE ORGANISATION ID EINTRAGEN !!!
    -- WICHTIG: Ersetzen Sie 'YOUR_ORG_ID_HERE' mit Ihrer echten Organization-ID
    -- aus dem Supabase Dashboard bevor Sie dieses Skript ausführen!
    target_org_id UUID := 'YOUR_ORG_ID_HERE';
    
    -- Variablen für IDs
    bike_city_id UUID;
    bike_trekking_id UUID;
    bike_cargo_id UUID;
    bike_mtb_id UUID;
    bike_kids_id UUID;
    bike_road_id UUID;
    
    customer_max_id UUID;
    customer_anna_id UUID;
    customer_thomas_id UUID;
    customer_familie_id UUID;
    customer_sarah_id UUID;
    
    current_year TEXT := TO_CHAR(NOW(), 'YYYY');
BEGIN
    -- Validierung (Entfernt)

    -- 1. BEREINIGUNG (Alte Daten löschen)
    
    -- Prüfen ob Tabellen existieren und löschen
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'booking_history') THEN
        EXECUTE 'DELETE FROM booking_history WHERE booking_id IN (SELECT id FROM bookings WHERE organization_id = $1)' USING target_org_id;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'invoices') THEN
        EXECUTE 'DELETE FROM invoices WHERE organization_id = $1' USING target_org_id;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'maintenance_logs') THEN
        EXECUTE 'DELETE FROM maintenance_logs WHERE organization_id = $1' USING target_org_id;
    END IF;

    DELETE FROM bookings WHERE organization_id = target_org_id;
    DELETE FROM bikes WHERE organization_id = target_org_id;
    DELETE FROM customers WHERE organization_id = target_org_id;
    
    -- 1.5 SCHEMA UPDATES (Automatisch fehlende Spalten hinzufügen)
    EXECUTE 'ALTER TABLE bikes ADD COLUMN IF NOT EXISTS description TEXT';
    EXECUTE 'ALTER TABLE bikes ADD COLUMN IF NOT EXISTS battery TEXT';
    EXECUTE 'ALTER TABLE bikes ADD COLUMN IF NOT EXISTS motor TEXT';
    EXECUTE 'ALTER TABLE bikes ADD COLUMN IF NOT EXISTS brand TEXT';
    EXECUTE 'ALTER TABLE bikes ADD COLUMN IF NOT EXISTS model TEXT';
    EXECUTE 'ALTER TABLE bikes ADD COLUMN IF NOT EXISTS size TEXT';
    EXECUTE 'ALTER TABLE bikes ADD COLUMN IF NOT EXISTS color TEXT';
    EXECUTE 'ALTER TABLE bikes ADD COLUMN IF NOT EXISTS frame_number TEXT';
    EXECUTE 'ALTER TABLE bikes ADD COLUMN IF NOT EXISTS price_per_week DECIMAL(10,2)';
    EXECUTE 'ALTER TABLE bikes ADD COLUMN IF NOT EXISTS deposit DECIMAL(10,2)';
    EXECUTE 'ALTER TABLE bikes ADD COLUMN IF NOT EXISTS image_url TEXT';
    
    -- Fix Booking Number Type (Integer -> Text für VR-Format)
    EXECUTE 'ALTER TABLE bookings ALTER COLUMN booking_number TYPE TEXT';

    EXECUTE 'ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0';
    EXECUTE 'ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(10,2) DEFAULT 0';
    EXECUTE 'ALTER TABLE customers ADD COLUMN IF NOT EXISTS city TEXT';
    EXECUTE 'ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone TEXT';
    -- [NEW] Universal Check-in Support
    EXECUTE 'ALTER TABLE customers ADD COLUMN IF NOT EXISTS id_number TEXT';
    EXECUTE 'ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT';
    -- Relax constraints for Quick Check-in
    EXECUTE 'ALTER TABLE customers ALTER COLUMN email DROP NOT NULL';
    EXECUTE 'ALTER TABLE customers ALTER COLUMN phone DROP NOT NULL';

    EXECUTE 'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_name TEXT';
    EXECUTE 'ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2)';

    -- 2. NEUE BIKES ERSTELLEN
    INSERT INTO bikes (organization_id, name, description, category, brand, model, size, color, frame_number, price_per_day, price_per_week, deposit, battery, motor, status, image_url) VALUES
    (target_org_id, 'City E-Bike "Moritz"', 'Komfortables Stadtrad', 'e-bike', 'Cube', 'Town Sport Hybrid', 'M', 'Schwarz', 'WTU-2023-001', 35.00, 200.00, 100.00, '500 Wh', 'Bosch Active Plus', 'available', 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800') RETURNING id INTO bike_city_id;
    
    INSERT INTO bikes (organization_id, name, description, category, brand, model, size, color, frame_number, price_per_day, price_per_week, deposit, battery, motor, status, image_url) VALUES
    (target_org_id, 'Trekking E-Bike "Alpen"', 'Sportliches Trekking-Rad', 'e-bike', 'Haibike', 'Trekking 5', 'L', 'Grün', 'WTU-2023-003', 45.00, 250.00, 150.00, '625 Wh', 'Bosch CX', 'available', 'https://images.unsplash.com/photo-1596707323385-a77382216fb9?w=800') RETURNING id INTO bike_trekking_id;
    
    INSERT INTO bikes (organization_id, name, description, category, brand, model, size, color, frame_number, price_per_day, price_per_week, deposit, battery, motor, status, image_url) VALUES
    (target_org_id, 'Lastenrad "Cargo"', 'Familien-Lastenrad', 'cargo', 'Babboe', 'Big-E', 'Universal', 'Holz', 'WTU-2023-007', 55.00, 300.00, 150.00, '500 Wh', 'Yamaha', 'available', 'https://images.unsplash.com/photo-1626880053704-5858693c0429?w=800') RETURNING id INTO bike_cargo_id;
    
    INSERT INTO bikes (organization_id, name, description, category, brand, model, size, color, frame_number, price_per_day, price_per_week, deposit, battery, motor, status, image_url) VALUES
    (target_org_id, 'MTB E-Bike "Trail"', 'Vollgefedertes E-MTB', 'e-mtb', 'Specialized', 'Levo', 'L', 'Orange', 'WTU-2023-004', 65.00, 350.00, 200.00, '700 Wh', 'Brose', 'available', 'https://images.unsplash.com/photo-1576435728678-be95e39e565b?w=800') RETURNING id INTO bike_mtb_id;

    INSERT INTO bikes (organization_id, name, category, brand, model, status, price_per_day, price_per_week, deposit, description) VALUES
    (target_org_id, 'Kinder E-Bike "Junior"', 'e-bike', 'Woom', 'UP 5', 'available', 25.00, 120.00, 50.00, 'Leichtes E-Bike für Kinder') RETURNING id INTO bike_kids_id;
    
    INSERT INTO bikes (organization_id, name, category, brand, model, status, price_per_day, price_per_week, deposit, description) VALUES
    (target_org_id, 'Rennrad "Speed"', 'road', 'Canyon', 'Endurace', 'maintenance', 45.00, 250.00, 200.00, 'High-End Carbon Rennrad') RETURNING id INTO bike_road_id;

    -- 3. NEUE KUNDEN ERSTELLEN
    INSERT INTO customers (organization_id, first_name, last_name, email, phone, city, total_bookings, total_revenue) VALUES
    (target_org_id, 'Max', 'Mustermann', 'max@example.com', '+49 171 12345', 'München', 1, 105.00) RETURNING id INTO customer_max_id;
    
    INSERT INTO customers (organization_id, first_name, last_name, email, phone, city, total_bookings, total_revenue) VALUES
    (target_org_id, 'Anna', 'Schmidt', 'anna@example.com', '+49 172 23456', 'Hamburg', 1, 195.00) RETURNING id INTO customer_anna_id;
    
    INSERT INTO customers (organization_id, first_name, last_name, email, phone, city, total_bookings, total_revenue) VALUES
    (target_org_id, 'Thomas', 'Weber', 'thomas@example.com', '+49 173 34567', 'Stuttgart', 1, 225.00) RETURNING id INTO customer_thomas_id;
    
    INSERT INTO customers (organization_id, first_name, last_name, email, phone, city, total_bookings, total_revenue) VALUES
    (target_org_id, 'Familie', 'Bauer', 'bauer@example.com', '+49 175 56789', 'Salzburg', 1, 165.00) RETURNING id INTO customer_familie_id;
    
    INSERT INTO customers (organization_id, first_name, last_name, email, phone, city, total_bookings, total_revenue) VALUES
    (target_org_id, 'Sarah', 'Connor', 'sarah@skynet.com', '+1 555 1234', 'Los Angeles', 0, 0) RETURNING id INTO customer_sarah_id;

    -- 4. BUCHUNGEN ERSTELLEN (Manuelle Nummerierung erzwingen)
    
    -- 1. Vergangene Buchung (Max)
    INSERT INTO bookings (organization_id, booking_number, bike_id, customer_id, customer_name, start_date, end_date, total_price, status) VALUES
    (target_org_id, 'VR-' || current_year || '-0001', bike_city_id, customer_max_id, 'Max Mustermann', CURRENT_DATE - 14, CURRENT_DATE - 11, 105.00, 'returned');

    -- 2. Aktive Buchung 1 (Thomas)
    INSERT INTO bookings (organization_id, booking_number, bike_id, customer_id, customer_name, start_date, end_date, total_price, status) VALUES
    (target_org_id, 'VR-' || current_year || '-0002', bike_trekking_id, customer_thomas_id, 'Thomas Weber', CURRENT_DATE - 2, CURRENT_DATE + 3, 225.00, 'picked_up');

    -- 3. Reservierung 1 (Anna)
    INSERT INTO bookings (organization_id, booking_number, bike_id, customer_id, customer_name, start_date, end_date, total_price, status) VALUES
    (target_org_id, 'VR-' || current_year || '-0003', bike_mtb_id, customer_anna_id, 'Anna Schmidt', CURRENT_DATE + 1, CURRENT_DATE + 4, 195.00, 'confirmed');

    -- 4. Reservierung 2 (Familie)
    INSERT INTO bookings (organization_id, booking_number, bike_id, customer_id, customer_name, start_date, end_date, total_price, status) VALUES
    (target_org_id, 'VR-' || current_year || '-0004', bike_cargo_id, customer_familie_id, 'Familie Bauer', CURRENT_DATE + 7, CURRENT_DATE + 10, 165.00, 'reserved');
    
    -- 5. Stornierte Buchung (Sarah) - Um "Status cancelled" zu zeigen
    INSERT INTO bookings (organization_id, booking_number, bike_id, customer_id, customer_name, start_date, end_date, total_price, status) VALUES
    (target_org_id, 'VR-' || current_year || '-0005', bike_kids_id, customer_sarah_id, 'Sarah Connor', CURRENT_DATE + 12, CURRENT_DATE + 15, 80.00, 'cancelled');

    -- 6. Langzeitmiete (Max nochmal) - Zukünftig
    INSERT INTO bookings (organization_id, booking_number, bike_id, customer_id, customer_name, start_date, end_date, total_price, status) VALUES
    (target_org_id, 'VR-' || current_year || '-0006', bike_city_id, customer_max_id, 'Max Mustermann', CURRENT_DATE + 20, CURRENT_DATE + 25, 200.00, 'reserved');

    -- 5. STATUS UPDATES
    UPDATE bikes SET status = 'rented' WHERE id IN (bike_trekking_id);
    
END $$;
