-- Migration 004: Fix get_hotel_with_providers RPC to include price_per_hour
-- Bug: price_per_hour was missing from the bike jsonb_build_object,
-- causing hourly bookings to fail at the stripe-checkout Edge Function.

CREATE OR REPLACE FUNCTION get_hotel_with_providers(p_hotel_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hotel   RECORD;
  v_provider_row RECORD;
  v_providers JSONB := '[]'::JSONB;
  v_bikes   JSONB;
BEGIN
  SELECT id, name, slug, address, city, region_id, logo_url, description
  INTO v_hotel
  FROM hotels
  WHERE slug = p_hotel_slug AND is_active = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  FOR v_provider_row IN
    SELECT
      o.id, o.name, o.provider_description, o.provider_address,
      o.provider_phone, o.provider_website, o.provider_opening_hours,
      o.provider_photos, hp.distance_km
    FROM hotel_providers hp
    JOIN organizations o ON o.id = hp.organization_id
    WHERE hp.hotel_id = v_hotel.id
      AND hp.is_active = true
      AND o.is_platform_provider = true
    ORDER BY hp.distance_km ASC NULLS LAST
  LOOP
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id',            b.id,
        'name',          b.name,
        'category',      b.category,
        'price_per_day', b.price_per_day,
        'price_per_hour', b.price_per_hour,
        'deposit',       b.deposit,
        'image_url',     b.image_url,
        'status',        b.status,
        'description',   b.model
      ) ORDER BY b.name
    ), '[]'::JSONB)
    INTO v_bikes
    FROM bikes b
    WHERE b.organization_id = v_provider_row.id
      AND b.status = 'available';

    v_providers := v_providers || jsonb_build_array(
      jsonb_build_object(
        'id',                     v_provider_row.id,
        'name',                   v_provider_row.name,
        'provider_description',   v_provider_row.provider_description,
        'provider_address',       v_provider_row.provider_address,
        'provider_phone',         v_provider_row.provider_phone,
        'provider_website',       v_provider_row.provider_website,
        'provider_opening_hours', v_provider_row.provider_opening_hours,
        'distance_km',            v_provider_row.distance_km,
        'bikes',                  v_bikes
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'hotel', jsonb_build_object(
      'id',          v_hotel.id,
      'name',        v_hotel.name,
      'slug',        v_hotel.slug,
      'address',     v_hotel.address,
      'city',        v_hotel.city,
      'region_id',   v_hotel.region_id,
      'logo_url',    v_hotel.logo_url,
      'description', v_hotel.description
    ),
    'providers', v_providers
  );
END;
$$;
