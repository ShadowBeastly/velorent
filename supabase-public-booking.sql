-- =====================================================
-- VELORENT PRO - PUBLIC BOOKING EXTENSION
-- Ermöglicht öffentliche Buchungen ohne Login
-- Schützt alle Kundendaten vor öffentlichem Zugriff
-- =====================================================

-- =====================================================
-- 1. PUBLIC BOOKING SETTINGS (Widget-Konfiguration)
-- =====================================================
CREATE TABLE IF NOT EXISTS public_booking_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    
    -- Widget aktiviert?
    is_enabled BOOLEAN DEFAULT FALSE,
    
    -- API Key für öffentliche Anfragen (nicht der Supabase Key!)
    public_api_key TEXT UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
    
    -- Styling
    primary_color TEXT DEFAULT '#f97316',
    secondary_color TEXT DEFAULT '#fbbf24',
    border_radius INTEGER DEFAULT 12,
    font_family TEXT DEFAULT 'Inter, system-ui, sans-serif',
    
    -- Buchungsregeln
    min_days INTEGER DEFAULT 1,
    max_days INTEGER DEFAULT 30,
    min_advance_hours INTEGER DEFAULT 2, -- Mindestens 2h vorher buchen
    max_advance_days INTEGER DEFAULT 90, -- Max 90 Tage im Voraus
    require_phone BOOLEAN DEFAULT TRUE,
    require_email BOOLEAN DEFAULT TRUE,
    require_address BOOLEAN DEFAULT FALSE,
    
    -- Zahlungsoptionen
    payment_mode TEXT DEFAULT 'on_pickup', -- on_pickup, online, both
    deposit_required BOOLEAN DEFAULT TRUE,
    
    -- Bestätigungsmodus
    auto_confirm BOOLEAN DEFAULT FALSE, -- Automatisch bestätigen oder manuell?
    
    -- Texte (mehrsprachig möglich)
    welcome_text TEXT DEFAULT 'Buchen Sie Ihr Fahrrad in wenigen Schritten',
    success_text TEXT DEFAULT 'Vielen Dank! Ihre Buchung wurde erfolgreich erstellt.',
    terms_url TEXT,
    privacy_url TEXT,
    
    -- Allowed origins für CORS
    allowed_origins TEXT[] DEFAULT ARRAY['*'],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger für updated_at
CREATE TRIGGER update_public_booking_settings_updated_at 
    BEFORE UPDATE ON public_booking_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 2. PUBLIC VIEWS (Nur öffentlich relevante Daten)
-- =====================================================

-- View für öffentlich sichtbare Räder (KEINE Rahmennummer, Kaufpreis etc.)
CREATE OR REPLACE VIEW public_bikes AS
SELECT 
    b.id,
    b.organization_id,
    b.name,
    b.description,
    b.category,
    b.brand,
    b.size,
    b.color,
    b.price_per_day,
    b.price_per_week,
    b.price_per_hour,
    b.deposit,
    b.image_url,
    b.status,
    b.accessories
FROM bikes b
WHERE b.status IN ('available', 'rented'); -- Keine Wartungs-Räder zeigen

-- View für belegte Zeiträume (OHNE Kundendaten!)
CREATE OR REPLACE VIEW public_availability AS
SELECT 
    bike_id,
    start_date,
    end_date
FROM bookings
WHERE status NOT IN ('cancelled', 'no_show');

-- =====================================================
-- 3. PUBLIC FUNCTIONS (Sichere API-Endpunkte)
-- =====================================================

-- Funktion: Räder für eine Organisation abrufen
CREATE OR REPLACE FUNCTION get_public_bikes(p_api_key TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    category TEXT,
    brand TEXT,
    size TEXT,
    color TEXT,
    price_per_day DECIMAL,
    price_per_week DECIMAL,
    deposit DECIMAL,
    image_url TEXT,
    accessories JSONB
) AS $$
DECLARE
    v_org_id UUID;
    v_enabled BOOLEAN;
BEGIN
    -- API Key validieren
    SELECT pbs.organization_id, pbs.is_enabled 
    INTO v_org_id, v_enabled
    FROM public_booking_settings pbs
    WHERE pbs.public_api_key = p_api_key;
    
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Invalid API key';
    END IF;
    
    IF NOT v_enabled THEN
        RAISE EXCEPTION 'Public booking is disabled';
    END IF;
    
    RETURN QUERY
    SELECT 
        b.id,
        b.name,
        b.description,
        b.category,
        b.brand,
        b.size,
        b.color,
        b.price_per_day,
        b.price_per_week,
        b.deposit,
        b.image_url,
        b.accessories
    FROM bikes b
    WHERE b.organization_id = v_org_id
    AND b.status = 'available';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion: Verfügbarkeit prüfen (gibt nur true/false zurück, keine Details!)
CREATE OR REPLACE FUNCTION check_availability(
    p_api_key TEXT,
    p_bike_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS JSONB AS $$
DECLARE
    v_org_id UUID;
    v_enabled BOOLEAN;
    v_settings public_booking_settings%ROWTYPE;
    v_conflict_count INTEGER;
    v_bike bikes%ROWTYPE;
    v_total_days INTEGER;
    v_total_price DECIMAL;
BEGIN
    -- Settings laden
    SELECT * INTO v_settings
    FROM public_booking_settings
    WHERE public_api_key = p_api_key;
    
    IF v_settings.id IS NULL THEN
        RETURN jsonb_build_object('available', false, 'error', 'Invalid API key');
    END IF;
    
    IF NOT v_settings.is_enabled THEN
        RETURN jsonb_build_object('available', false, 'error', 'Booking disabled');
    END IF;
    
    -- Bike prüfen
    SELECT * INTO v_bike FROM bikes 
    WHERE id = p_bike_id AND organization_id = v_settings.organization_id;
    
    IF v_bike.id IS NULL THEN
        RETURN jsonb_build_object('available', false, 'error', 'Bike not found');
    END IF;
    
    IF v_bike.status != 'available' THEN
        RETURN jsonb_build_object('available', false, 'error', 'Bike not available');
    END IF;
    
    -- Datum validieren
    IF p_start_date < CURRENT_DATE THEN
        RETURN jsonb_build_object('available', false, 'error', 'Start date in past');
    END IF;
    
    IF p_end_date < p_start_date THEN
        RETURN jsonb_build_object('available', false, 'error', 'Invalid date range');
    END IF;
    
    v_total_days := (p_end_date - p_start_date) + 1;
    
    IF v_total_days < v_settings.min_days THEN
        RETURN jsonb_build_object('available', false, 'error', 'Minimum ' || v_settings.min_days || ' days required');
    END IF;
    
    IF v_total_days > v_settings.max_days THEN
        RETURN jsonb_build_object('available', false, 'error', 'Maximum ' || v_settings.max_days || ' days allowed');
    END IF;
    
    -- Advance booking prüfen
    IF p_start_date > (CURRENT_DATE + v_settings.max_advance_days) THEN
        RETURN jsonb_build_object('available', false, 'error', 'Cannot book more than ' || v_settings.max_advance_days || ' days in advance');
    END IF;
    
    -- Konflikte prüfen
    SELECT COUNT(*) INTO v_conflict_count
    FROM bookings
    WHERE bike_id = p_bike_id
    AND status NOT IN ('cancelled', 'no_show')
    AND start_date <= p_end_date
    AND end_date >= p_start_date;
    
    IF v_conflict_count > 0 THEN
        RETURN jsonb_build_object('available', false, 'error', 'Dates not available');
    END IF;
    
    -- Preis berechnen
    IF v_total_days >= 7 AND v_bike.price_per_week IS NOT NULL THEN
        v_total_price := (v_total_days / 7) * v_bike.price_per_week + 
                         (v_total_days % 7) * v_bike.price_per_day;
    ELSE
        v_total_price := v_total_days * v_bike.price_per_day;
    END IF;
    
    RETURN jsonb_build_object(
        'available', true,
        'bike_name', v_bike.name,
        'total_days', v_total_days,
        'price_per_day', v_bike.price_per_day,
        'total_price', v_total_price,
        'deposit', v_bike.deposit
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion: Öffentliche Buchung erstellen
CREATE OR REPLACE FUNCTION create_public_booking(
    p_api_key TEXT,
    p_bike_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_customer_name TEXT,
    p_customer_email TEXT DEFAULT NULL,
    p_customer_phone TEXT DEFAULT NULL,
    p_customer_address TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_accessories JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
    v_settings public_booking_settings%ROWTYPE;
    v_availability JSONB;
    v_booking_id UUID;
    v_booking_number TEXT;
    v_status TEXT;
    v_customer_id UUID;
BEGIN
    -- Settings laden
    SELECT * INTO v_settings
    FROM public_booking_settings
    WHERE public_api_key = p_api_key;
    
    IF v_settings.id IS NULL OR NOT v_settings.is_enabled THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or disabled');
    END IF;
    
    -- Pflichtfelder prüfen
    IF p_customer_name IS NULL OR LENGTH(TRIM(p_customer_name)) < 2 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Name required');
    END IF;
    
    IF v_settings.require_email AND (p_customer_email IS NULL OR p_customer_email !~ '^[^@]+@[^@]+\.[^@]+$') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Valid email required');
    END IF;
    
    IF v_settings.require_phone AND (p_customer_phone IS NULL OR LENGTH(p_customer_phone) < 6) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Phone required');
    END IF;
    
    IF v_settings.require_address AND (p_customer_address IS NULL OR LENGTH(p_customer_address) < 5) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Address required');
    END IF;
    
    -- Verfügbarkeit nochmal prüfen (Race Condition verhindern)
    v_availability := check_availability(p_api_key, p_bike_id, p_start_date, p_end_date);
    
    IF NOT (v_availability->>'available')::boolean THEN
        RETURN jsonb_build_object('success', false, 'error', v_availability->>'error');
    END IF;
    
    -- Status bestimmen
    v_status := CASE WHEN v_settings.auto_confirm THEN 'confirmed' ELSE 'reserved' END;
    
    -- Kunde anlegen oder finden
    SELECT id INTO v_customer_id
    FROM customers
    WHERE organization_id = v_settings.organization_id
    AND (
        (email IS NOT NULL AND email = p_customer_email)
        OR (phone IS NOT NULL AND phone = p_customer_phone)
    )
    LIMIT 1;
    
    IF v_customer_id IS NULL THEN
        INSERT INTO customers (
            organization_id, first_name, email, phone, address
        ) VALUES (
            v_settings.organization_id,
            p_customer_name,
            p_customer_email,
            p_customer_phone,
            p_customer_address
        ) RETURNING id INTO v_customer_id;
    END IF;
    
    -- Buchung erstellen
    INSERT INTO bookings (
        organization_id,
        bike_id,
        customer_id,
        customer_name,
        customer_email,
        customer_phone,
        customer_address,
        start_date,
        end_date,
        price_per_day,
        total_days,
        total_price,
        deposit_amount,
        status,
        notes,
        accessories,
        source
    ) VALUES (
        v_settings.organization_id,
        p_bike_id,
        v_customer_id,
        p_customer_name,
        p_customer_email,
        p_customer_phone,
        p_customer_address,
        p_start_date,
        p_end_date,
        (v_availability->>'price_per_day')::decimal,
        (v_availability->>'total_days')::integer,
        (v_availability->>'total_price')::decimal,
        (v_availability->>'deposit')::decimal,
        v_status,
        p_notes,
        p_accessories,
        'website'
    ) RETURNING id, booking_number INTO v_booking_id, v_booking_number;
    
    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'booking_number', v_booking_number,
        'status', v_status,
        'total_price', (v_availability->>'total_price')::decimal,
        'deposit', (v_availability->>'deposit')::decimal,
        'message', v_settings.success_text
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion: Belegte Tage für ein Rad abrufen (für Kalender-Blockierung)
CREATE OR REPLACE FUNCTION get_blocked_dates(
    p_api_key TEXT,
    p_bike_id UUID,
    p_from_date DATE DEFAULT CURRENT_DATE,
    p_to_date DATE DEFAULT (CURRENT_DATE + INTERVAL '90 days')::DATE
) RETURNS JSONB AS $$
DECLARE
    v_org_id UUID;
    v_enabled BOOLEAN;
    v_blocked_dates DATE[];
    v_booking RECORD;
BEGIN
    -- API Key validieren
    SELECT pbs.organization_id, pbs.is_enabled 
    INTO v_org_id, v_enabled
    FROM public_booking_settings pbs
    WHERE pbs.public_api_key = p_api_key;
    
    IF v_org_id IS NULL OR NOT v_enabled THEN
        RETURN jsonb_build_object('error', 'Invalid or disabled');
    END IF;
    
    -- Alle belegten Daten sammeln
    v_blocked_dates := ARRAY[]::DATE[];
    
    FOR v_booking IN
        SELECT start_date, end_date
        FROM bookings
        WHERE bike_id = p_bike_id
        AND status NOT IN ('cancelled', 'no_show')
        AND end_date >= p_from_date
        AND start_date <= p_to_date
    LOOP
        FOR i IN 0..(v_booking.end_date - v_booking.start_date) LOOP
            v_blocked_dates := array_append(v_blocked_dates, v_booking.start_date + i);
        END LOOP;
    END LOOP;
    
    RETURN jsonb_build_object(
        'blocked_dates', v_blocked_dates,
        'from_date', p_from_date,
        'to_date', p_to_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion: Widget-Settings abrufen (für Styling)
CREATE OR REPLACE FUNCTION get_widget_settings(p_api_key TEXT)
RETURNS JSONB AS $$
DECLARE
    v_settings public_booking_settings%ROWTYPE;
    v_org organizations%ROWTYPE;
BEGIN
    SELECT * INTO v_settings
    FROM public_booking_settings
    WHERE public_api_key = p_api_key;
    
    IF v_settings.id IS NULL OR NOT v_settings.is_enabled THEN
        RETURN jsonb_build_object('error', 'Invalid or disabled');
    END IF;
    
    SELECT * INTO v_org FROM organizations WHERE id = v_settings.organization_id;
    
    RETURN jsonb_build_object(
        'organization_name', v_org.name,
        'logo_url', v_org.logo_url,
        'primary_color', v_settings.primary_color,
        'secondary_color', v_settings.secondary_color,
        'border_radius', v_settings.border_radius,
        'font_family', v_settings.font_family,
        'welcome_text', v_settings.welcome_text,
        'min_days', v_settings.min_days,
        'max_days', v_settings.max_days,
        'max_advance_days', v_settings.max_advance_days,
        'require_phone', v_settings.require_phone,
        'require_email', v_settings.require_email,
        'require_address', v_settings.require_address,
        'deposit_required', v_settings.deposit_required,
        'terms_url', v_settings.terms_url,
        'privacy_url', v_settings.privacy_url
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. RLS POLICIES FÜR PUBLIC_BOOKING_SETTINGS
-- =====================================================

ALTER TABLE public_booking_settings ENABLE ROW LEVEL SECURITY;

-- Admins können ihre Settings verwalten
CREATE POLICY "Admins can manage booking settings" ON public_booking_settings
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- =====================================================
-- 5. GRANT PERMISSIONS FÜR ANON USER
-- =====================================================

-- Anon-User dürfen die public functions aufrufen
GRANT EXECUTE ON FUNCTION get_public_bikes(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION check_availability(TEXT, UUID, DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION create_public_booking(TEXT, UUID, DATE, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION get_blocked_dates(TEXT, UUID, DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION get_widget_settings(TEXT) TO anon;

-- =====================================================
-- 6. INDEX FÜR SCHNELLE API-KEY LOOKUPS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_public_booking_api_key 
    ON public_booking_settings(public_api_key) 
    WHERE is_enabled = TRUE;
