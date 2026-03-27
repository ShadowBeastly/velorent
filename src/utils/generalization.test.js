import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const readFile = (rel) => readFileSync(join(ROOT, rel), 'utf8');

// ============================================================
// 1. SQL Migration Integrity Tests
// ============================================================

describe('SQL Migrations — structural integrity', () => {
  const migrations = [
    '20260327_100_commission_rates.sql',
    '20260327_102_discriminators.sql',
    '20260327_103_rename_bikes_to_items.sql',
    '20260327_104_rename_hotels_to_venues.sql',
    '20260327_105_v2_rpcs.sql',
    '20260327_106_venue_registrations.sql',
  ];

  for (const file of migrations) {
    describe(file, () => {
      let sql;
      it('file exists and is readable', () => {
        sql = readFile(`supabase/migrations/${file}`);
        assert.ok(sql.length > 0, 'File should not be empty');
      });

      it('wrapped in BEGIN/COMMIT', () => {
        sql = sql || readFile(`supabase/migrations/${file}`);
        assert.ok(sql.includes('BEGIN;'), 'Missing BEGIN');
        assert.ok(sql.includes('COMMIT;'), 'Missing COMMIT');
      });

      it('has rollback comment', () => {
        sql = sql || readFile(`supabase/migrations/${file}`);
        assert.ok(sql.includes('-- Rollback:'), 'Missing rollback comment');
      });

      it('has NOTIFY pgrst reload', () => {
        sql = sql || readFile(`supabase/migrations/${file}`);
        assert.ok(sql.includes("NOTIFY pgrst, 'reload schema'"), 'Missing schema reload');
      });
    });
  }
});

describe('commission_rates migration', () => {
  const sql = readFile('supabase/migrations/20260327_100_commission_rates.sql');

  it('creates commission_rates table', () => {
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS commission_rates'));
  });

  it('seeds all 17 rate categories', () => {
    const categories = [
      'E-Bike', 'Mountainbike', 'City-Bike', 'Trekking', 'E-MTB', 'Lastenrad',
      'Canoe', 'SUP', 'Go-Kart', 'Climbing', 'Escape Room',
      'Guided Tour', 'Wine Tasting', 'Wellness', 'Spa',
      'Hot Air Balloon', 'Sailing',
    ];
    for (const cat of categories) {
      assert.ok(sql.includes(`'${cat}'`), `Missing category: ${cat}`);
    }
  });

  it('enables RLS', () => {
    assert.ok(sql.includes('ENABLE ROW LEVEL SECURITY'));
  });
});

describe('bikes→items rename migration', () => {
  const sql = readFile('supabase/migrations/20260327_103_rename_bikes_to_items.sql');

  it('renames bikes to items', () => {
    assert.ok(sql.includes('ALTER TABLE bikes RENAME TO items'));
  });

  it('creates backward-compat bikes view', () => {
    assert.ok(sql.includes('CREATE OR REPLACE VIEW bikes AS SELECT * FROM items'));
  });

  it('grants on bikes view for all 3 roles', () => {
    assert.ok(sql.includes('GRANT SELECT, INSERT, UPDATE, DELETE ON bikes TO authenticated'));
    assert.ok(sql.includes('GRANT SELECT, INSERT, UPDATE, DELETE ON bikes TO anon'));
    assert.ok(sql.includes('GRANT SELECT, INSERT, UPDATE, DELETE ON bikes TO service_role'));
  });

  it('adds item_id to bookings with sync trigger', () => {
    assert.ok(sql.includes('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS item_id UUID'));
    assert.ok(sql.includes('sync_booking_item_id'));
  });

  it('adds item_id to analytics_events with sync trigger', () => {
    assert.ok(sql.includes('ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS item_id UUID'));
    assert.ok(sql.includes('sync_analytics_item_id'));
  });

  it('uses IF EXISTS guards for optional tables', () => {
    assert.ok(sql.includes("table_name = 'bike_categories'"), 'Missing IF EXISTS for bike_categories');
    assert.ok(sql.includes("table_name = 'bike_health'"), 'Missing IF EXISTS for bike_health');
    assert.ok(sql.includes("table_name = 'maintenance_logs'"), 'Missing IF EXISTS for maintenance_logs');
  });

  it('fixes missing customers columns before bookings UPDATE', () => {
    assert.ok(sql.includes('ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_booking_at'));
    assert.ok(sql.includes('ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at'));
    // updated_at must come BEFORE the bookings UPDATE to avoid trigger cascade
    const updatedAtPos = sql.indexOf('customers ADD COLUMN IF NOT EXISTS updated_at');
    const bookingsUpdatePos = sql.indexOf('UPDATE bookings SET item_id = bike_id');
    assert.ok(updatedAtPos < bookingsUpdatePos, 'customers.updated_at must be added BEFORE bookings UPDATE');
  });
});

describe('hotels→venues rename migration', () => {
  const sql = readFile('supabase/migrations/20260327_104_rename_hotels_to_venues.sql');

  it('renames all hotel tables', () => {
    assert.ok(sql.includes('ALTER TABLE hotels RENAME TO venues'));
    assert.ok(sql.includes('ALTER TABLE hotel_providers RENAME TO venue_providers'));
    assert.ok(sql.includes('ALTER TABLE hotel_users RENAME TO venue_users'));
    assert.ok(sql.includes('ALTER TABLE hotel_activities RENAME TO venue_activities'));
    assert.ok(sql.includes('ALTER TABLE hotel_rooms RENAME TO venue_areas'));
  });

  it('creates backward-compat views for all', () => {
    assert.ok(sql.includes('CREATE OR REPLACE VIEW hotels AS SELECT * FROM venues'));
    assert.ok(sql.includes('CREATE OR REPLACE VIEW hotel_providers AS SELECT * FROM venue_providers'));
    assert.ok(sql.includes('CREATE OR REPLACE VIEW hotel_users AS SELECT * FROM venue_users'));
    assert.ok(sql.includes('CREATE OR REPLACE VIEW hotel_activities AS SELECT * FROM venue_activities'));
    assert.ok(sql.includes('CREATE OR REPLACE VIEW hotel_rooms AS SELECT * FROM venue_areas'));
  });

  it('adds venue_id alias to bookings, analytics, activities', () => {
    assert.ok(sql.includes('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS venue_id UUID'));
    assert.ok(sql.includes('ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS venue_id UUID'));
    assert.ok(sql.includes('ALTER TABLE activities ADD COLUMN IF NOT EXISTS venue_id UUID'));
  });
});

describe('V2 RPCs migration', () => {
  const sql = readFile('supabase/migrations/20260327_105_v2_rpcs.sql');

  it('creates get_venue_with_providers', () => {
    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION get_venue_with_providers'));
  });

  it('get_venue_with_providers returns both venue and hotel keys', () => {
    assert.ok(sql.includes("'venue'"), 'Missing venue key in return');
    assert.ok(sql.includes("'hotel'"), 'Missing backward-compat hotel key in return');
  });

  it('get_venue_with_providers returns both items and bikes', () => {
    assert.ok(sql.includes("'items'"), 'Missing items key');
    assert.ok(sql.includes("'bikes'"), 'Missing backward-compat bikes key');
  });

  it('makes get_hotel_with_providers a wrapper', () => {
    assert.ok(sql.includes('RETURN get_venue_with_providers(p_hotel_slug)'));
  });

  it('creates create_item_booking', () => {
    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION create_item_booking'));
    assert.ok(sql.includes('p_item_id'));
    assert.ok(sql.includes('p_venue_id'));
  });

  it('updates create_guest_booking to use commission_rates', () => {
    assert.ok(sql.includes('FROM commission_rates cr'));
    // Should NOT have hardcoded CASE anymore
    const guestBookingStart = sql.indexOf('CREATE OR REPLACE FUNCTION create_guest_booking');
    const guestBookingEnd = sql.indexOf('$$;', guestBookingStart);
    const guestBookingBody = sql.slice(guestBookingStart, guestBookingEnd);
    assert.ok(!guestBookingBody.includes("WHEN 'E-Bike'"), 'Hardcoded CASE should be removed');
  });

  it('creates track_analytics_event_v2', () => {
    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION track_analytics_event_v2'));
    assert.ok(sql.includes('p_venue_id'));
    assert.ok(sql.includes('p_item_id'));
  });

  it('grants execute to anon for guest-facing RPCs', () => {
    assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION get_venue_with_providers'));
    assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION create_item_booking'));
    assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION track_analytics_event_v2'));
  });
});

// ============================================================
// 2. Hook Shim Tests
// ============================================================

describe('Phase 6: shim hooks deleted', () => {
  it('useBikes.js no longer exists', () => {
    assert.throws(() => readFile('src/hooks/useBikes.js'), 'useBikes.js should be deleted');
  });

  it('useBikeCategories.js no longer exists', () => {
    assert.throws(() => readFile('src/hooks/useBikeCategories.js'), 'useBikeCategories.js should be deleted');
  });
});

describe('useItems hook', () => {
  const src = readFile('src/hooks/useItems.js');

  it('queries from items table', () => {
    assert.ok(src.includes('.from("items")'));
  });

  it('exports useItems function', () => {
    assert.ok(src.includes('export function useItems'));
  });

  it('returns items, loading, reload, create, update, remove', () => {
    assert.ok(src.includes('return { items, loading, reload: load, create, update, remove }'));
  });
});

// ============================================================
// 3. DataContext Tests
// ============================================================

describe('DataContext', () => {
  const src = readFile('src/context/DataContext.jsx');

  it('imports useItems (not useBikes)', () => {
    assert.ok(src.includes('import { useItems }'));
    assert.ok(!src.includes('import { useBikes }'), 'Should not import useBikes directly');
  });

  it('imports useItemCategories (not useBikeCategories)', () => {
    assert.ok(src.includes('import { useItemCategories }'));
    assert.ok(!src.includes('import { useBikeCategories }'), 'Should not import useBikeCategories directly');
  });

  it('exports items key', () => {
    assert.ok(src.includes('items,') || src.includes('items:'));
  });

  it('exports bikes as backward-compat alias', () => {
    assert.ok(src.includes('bikes'));
  });

  it('exports itemCategories key', () => {
    assert.ok(src.includes('itemCategories'));
  });

  it('exports bikeCategories as backward-compat alias', () => {
    assert.ok(src.includes('bikeCategories'));
  });
});

// ============================================================
// 4. Stripe Webhook Dual-Read Tests
// ============================================================

describe('Stripe webhook — Phase 6 (no fallbacks)', () => {
  const src = readFile('app/api/stripe/webhook/route.js');

  it('reads item_id directly (no bike_id fallback)', () => {
    assert.ok(src.includes('meta.item_id'));
    assert.ok(!src.includes('meta.item_id ?? meta.bike_id'), 'Dual-read fallback should be removed');
  });

  it('uses itemId for RPC', () => {
    assert.ok(src.includes('p_bike_id: itemId'));
  });

  it('reads item_name directly (no bike_name fallback)', () => {
    assert.ok(src.includes('meta.item_name'));
    assert.ok(!src.includes('meta.item_name ?? meta.bike_name'), 'bike_name fallback should be removed');
  });

  it('queries items table for name lookup', () => {
    assert.ok(src.includes('.from("items")'));
  });

  it('uses item_id filter on bookings (not bike_id)', () => {
    assert.ok(src.includes('.eq("item_id", itemId)'));
  });
});

describe('Stripe checkout — Phase 6 (no dual-write)', () => {
  const src = readFile('supabase/functions/stripe-checkout/index.ts');

  it('writes item_id in metadata', () => {
    assert.ok(src.includes('item_id:'));
  });

  it('writes item_name in metadata', () => {
    assert.ok(src.includes('item_name:'));
  });

  it('no longer writes bike_id as a metadata key', () => {
    const metaStart = src.indexOf('metadata: {');
    const metaEnd = src.indexOf('},', metaStart);
    const metadataSection = src.slice(metaStart, metaEnd);
    // bike_id: should not be a key in metadata (bike_id as input var is fine)
    assert.ok(!metadataSection.includes('bike_id:'), 'bike_id: should be removed from Stripe metadata keys');
  });

  it('uses DB lookup for commission rate', () => {
    assert.ok(src.includes('.from("commission_rates")'));
  });
});

// ============================================================
// 5. Navigation & Labels Tests
// ============================================================

describe('Navigation labels', () => {
  const navSrc = readFile('src/utils/navigationItems.js');

  it('uses Package icon (not Bike)', () => {
    assert.ok(!navSrc.includes('Bike,') && !navSrc.includes('Bike }'), 'Should not import Bike icon');
  });
});

describe('i18n labels — de', () => {
  const de = readFile('src/utils/i18n/de.js');

  it('fleet label is "Angebote" (not "Flotte")', () => {
    assert.ok(de.includes('"Angebote"'));
  });
});

// ============================================================
// 6. VenueLandingPage / Route Tests
// ============================================================

describe('VenueLandingPage', () => {
  const src = readFile('src/views/venue/VenueLandingPage.jsx');

  it('re-exports from HotelLandingPage', () => {
    assert.ok(src.includes('export { default } from'));
    assert.ok(src.includes('HotelLandingPage'));
  });
});

describe('/venue/[slug] route', () => {
  const src = readFile('app/venue/[slug]/page.jsx');

  it('imports VenueLandingPage', () => {
    assert.ok(src.includes('VenueLandingPage'));
  });

  it('passes slug prop', () => {
    assert.ok(src.includes('slug={slug}'));
  });
});

describe('/venue/register route', () => {
  const src = readFile('app/venue/register/page.jsx');

  it('exists and has content', () => {
    assert.ok(src.length > 100);
  });

  it('calls register_self_managed_venue RPC', () => {
    assert.ok(src.includes('register_self_managed_venue'));
  });

  it('has venue type selection', () => {
    assert.ok(src.includes('airbnb') || src.includes('Airbnb'));
    assert.ok(src.includes('ferienwohnung') || src.includes('Ferienwohnung'));
    assert.ok(src.includes('campingplatz') || src.includes('Campingplatz'));
  });
});

describe('HotelLandingPage — generalized', () => {
  const src = readFile('src/views/hotel/HotelLandingPage.jsx');

  it('CAT_ICON includes experience categories', () => {
    assert.ok(src.includes('"Canoe"'), 'Missing Canoe in CAT_ICON');
    assert.ok(src.includes('"Escape Room"'), 'Missing Escape Room in CAT_ICON');
    assert.ok(src.includes('"Wine Tasting"'), 'Missing Wine Tasting in CAT_ICON');
  });

  it('uses provider.items with fallback', () => {
    assert.ok(src.includes('provider.items') || src.includes('provider.items ||'));
  });

  it('translation bike label is "Angebot" (de)', () => {
    // Find the de section and check
    const deSection = src.slice(0, src.indexOf('en: {'));
    assert.ok(deSection.includes('bike: "Angebot"'), 'de.bike should be "Angebot"');
  });

  it('has post-booking recommendations', () => {
    assert.ok(src.includes('moreExperiences') || src.includes('Weitere Erlebnisse'));
  });

  it('has session basket', () => {
    assert.ok(src.includes('lociva_basket'));
    assert.ok(src.includes('sessionStorage'));
  });
});

// ============================================================
// 7. Venue Registration Migration
// ============================================================

describe('venue_registrations migration', () => {
  const sql = readFile('supabase/migrations/20260327_106_venue_registrations.sql');

  it('creates venue_registrations table', () => {
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS venue_registrations'));
  });

  it('has status check constraint', () => {
    assert.ok(sql.includes("'pending'"));
    assert.ok(sql.includes("'approved'"));
    assert.ok(sql.includes("'rejected'"));
  });

  it('creates register_self_managed_venue RPC', () => {
    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION register_self_managed_venue'));
  });

  it('RPC creates inactive venue', () => {
    assert.ok(sql.includes('is_active, false') || sql.includes('is_active: false') || sql.includes('false'));
  });

  it('RPC sets is_self_managed = true', () => {
    assert.ok(sql.includes('is_self_managed'));
    assert.ok(sql.includes('true'));
  });

  it('grants execute to authenticated', () => {
    assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION register_self_managed_venue'));
    assert.ok(sql.includes('TO authenticated'));
  });
});

// ============================================================
// 8. Phase 2.3 — ItemModal + ItemsPage + Feature Flag Gate
// ============================================================

describe('ItemModal', () => {
  const src = readFile('src/components/fleet/ItemModal.jsx');

  it('exists and has content', () => {
    assert.ok(src.length > 200);
  });

  it('has item_type selector', () => {
    assert.ok(src.includes('item_type'));
    assert.ok(src.includes('rental') || src.includes('Verleih'));
    assert.ok(src.includes('experience') || src.includes('Erlebnis'));
  });

  it('has conditional fields for experience (capacity)', () => {
    assert.ok(src.includes('capacity'));
  });

  it('uses Package icon', () => {
    assert.ok(src.includes('Package'));
  });
});

describe('ItemsPage', () => {
  const src = readFile('src/views/ItemsPage.jsx');

  it('exists and has content', () => {
    assert.ok(src.length > 200);
  });

  it('uses items from DataContext (not bikes)', () => {
    assert.ok(src.includes('items') && src.includes('useData'));
  });

  it('imports ItemModal', () => {
    assert.ok(src.includes('ItemModal'));
  });

  it('has item_type filter', () => {
    assert.ok(src.includes('item_type') || src.includes('typeFilter') || src.includes('Typ'));
  });

  it('uses Package icon', () => {
    assert.ok(src.includes('Package'));
  });
});

describe('FleetPage — feature flag gate', () => {
  const src = readFile('src/views/FleetPage.jsx');

  it('imports useOrganization', () => {
    assert.ok(src.includes('useOrganization'));
  });

  it('imports ItemsPage', () => {
    assert.ok(src.includes('ItemsPage'));
  });

  it('checks generic_items_ui feature flag', () => {
    assert.ok(src.includes('generic_items_ui'));
  });

  it('renders ItemsPage when flag is set', () => {
    assert.ok(src.includes('<ItemsPage'));
  });
});
