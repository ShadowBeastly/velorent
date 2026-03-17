# CLAUDE-code.md — Developer Reference for Lociva

Fokussierte Entwickler-Referenz für die Lociva-Codebase. Für Business-Kontext siehe `CLAUDE.md`.

## Current State (März 2026)

Die Lociva-Plattform ist als MVP feature-complete. Alle drei Build-Phasen (A: Database, B: Guest Flow, C: Dashboards) sind umgesetzt.

### Was läuft

| Feature | Status | Dateien |
|---------|--------|---------|
| Lociva DB-Schema | Deployed | `supabase/migrations/001_lociva_extension.sql` |
| Stornierungstoken | Deployed | `supabase/migrations/002_cancellation_token.sql` |
| Gast-Buchungsflow | Fertig | `src/views/hotel/HotelLandingPage.jsx` |
| Gast-Stornierung | Fertig | `src/views/hotel/GuestCancelPage.jsx`, `app/api/booking/public/route.js` |
| Stripe Checkout | Fertig | `supabase/functions/stripe-checkout/index.ts`, `app/api/stripe/checkout/route.ts` |
| Stripe Connect | Fertig | `supabase/functions/stripe-connect/index.ts`, `src/views/MarketplacePage.jsx` |
| Stripe Refunds | Fertig | `supabase/functions/stripe-cancel/index.ts` |
| Stripe Webhooks | Fertig | `supabase/functions/stripe-webhook/index.ts`, `app/api/stripe/webhook/route.js` |
| Bestätigungs-Email | Fertig | `supabase/functions/send-email/index.ts` |
| Hotel Dashboard | Fertig | `src/views/HotelStatsPage.jsx` |
| Admin: Hotels | Fertig | `src/views/admin/AdminHotelsPage.jsx` |
| Admin: Providers | Fertig | `src/views/admin/AdminProvidersPage.jsx` |
| Admin: Regions | Fertig | `src/views/admin/AdminRegionsPage.jsx` |
| Admin: Analytics | Fertig | `src/views/admin/AdminAnalyticsPage.jsx` |
| i18n (DE/EN) | Fertig | `src/utils/i18n/de.js`, `en.js` |
| Brand Guide | Applied | `branding/lociva-brand-guide.md` |
| CI Pipeline | Fertig | `.github/workflows/ci.yml` |

### Nächste Schritte (Pre-Launch)

- Production Stripe-Keys einrichten + End-to-End Payment Testing
- Echte Hotel/Provider-Daten einpflegen (Rhein-Main Pilot)
- AGB juristisch prüfen lassen
- QR-Code Druckmaterial produzieren

## Route-Übersicht

### Öffentlich (kein Login)

| Route | View | Zweck |
|-------|------|-------|
| `/` | LandingPage | Marketing-Seite |
| `/login` | AuthPage | Login |
| `/signup` | AuthPage | Registrierung |
| `/hotel/[slug]` | HotelLandingPage | Gast-Buchungsflow (3 Schritte) |
| `/hotel/[slug]/cancel` | GuestCancelPage | Gast-Selbststornierung |
| `/impressum` `/datenschutz` `/agb` | LegalPages | Rechtliches |

### API Routes

| Route | Methode | Zweck |
|-------|---------|-------|
| `/api/booking/public` | GET | Buchung per Token laden |
| `/api/booking/public` | POST | Stornierung auslösen |
| `/api/stripe/checkout` | POST | Stripe Checkout Session erstellen |
| `/api/stripe/cancel` | POST | Stripe Refund auslösen |
| `/api/stripe/connect` | POST | Stripe Express Account erstellen |
| `/api/stripe/webhook` | POST | Stripe Events verarbeiten |

### Geschützt (/app/*)

| Route | View | Zweck |
|-------|------|-------|
| `/app` | DashboardPage | Provider-Dashboard |
| `/app/bookings` | BookingsPage | Buchungsverwaltung |
| `/app/calendar` | CalendarPage | Gantt-Kalender |
| `/app/fleet` | FleetPage | Fahrrad-/Geräteverwaltung |
| `/app/customers` | CustomersPage | Kundenverwaltung |
| `/app/invoices` | InvoicesPage | Rechnungen |
| `/app/categories` | CategoriesPage | Fahrzeug-Kategorien |
| `/app/addons` | AddOnsPage | Zubehör |
| `/app/pricing` | PricingPage | Preisregeln |
| `/app/maintenance` | MaintenancePage | Wartung |
| `/app/vouchers` | VouchersPage | Gutscheine |
| `/app/marketplace` | MarketplacePage | Stripe Connect + AGB + Hotel-Buchungen |
| `/app/hotel-stats` | HotelStatsPage | Hotel Read-Only Dashboard |
| `/app/settings` | SettingsPage | Org-Einstellungen + Team |

### Admin (/app/admin/*)

| Route | View | Zweck |
|-------|------|-------|
| `/app/admin/hotels` | AdminHotelsPage | Hotels CRUD + QR + Provider-Mapping |
| `/app/admin/providers` | AdminProvidersPage | Provider-Übersicht |
| `/app/admin/regions` | AdminRegionsPage | Regionen + Scout-Zuordnung |
| `/app/admin/analytics` | AdminAnalyticsPage | Plattform-Analytics |

## Supabase RPCs

| RPC | Kontext | Was |
|-----|---------|-----|
| `get_hotel_with_providers(p_slug)` | Anon | Lädt Hotel + Provider + Bikes für `/hotel/[slug]` |
| `create_guest_booking(...)` | Anon | Erstellt Buchung mit Commission-Berechnung |
| `get_booking_by_token(p_token)` | Anon | Buchung per Stornierungstoken laden |
| `cancel_booking_by_token(p_token)` | Anon | Stornierung (free >24h, partial <24h) |
| `get_hotel_analytics(p_hotel_id, p_from, p_to)` | Admin | Aggregierte Hotel-Analytics |
| `track_analytics_event(p_hotel_id, p_type, p_meta)` | Anon | Analytics-Event einfügen |
| `is_platform_admin()` | Auth | Prüft `role = 'platform_admin'` |

## Edge Functions

| Function | Trigger | Was |
|----------|---------|-----|
| `send-email` | Nach Buchung | Brevo: Bestätigung an Gast (DE/EN) mit Stornierungslink |
| `stripe-checkout` | `/api/stripe/checkout` | Erstellt Stripe Checkout Session mit `application_fee_amount` |
| `stripe-connect` | `/api/stripe/connect` | Erstellt Stripe Express Account + Onboarding URL |
| `stripe-cancel` | `/api/stripe/cancel` | Stripe Refund (voll oder 50%) |
| `stripe-webhook` | Stripe Events | Verarbeitet `checkout.session.completed`, `charge.refunded` etc. |
| `delete-account` | User-Request | Löscht User-Account |

## Architektur-Regeln

### NICHT ändern
- `export const dynamic = "force-dynamic"` in `app/layout.jsx`
- `|| "placeholder"` Fallbacks in `src/utils/supabase.js`
- Provider-Hierarchie: AuthProvider → OrgProvider → AppProvider → DataProvider
- `daysDiff()` Berechnung in `formatters.js` (inklusiv, +1 eingebaut)
- Bestehende RLS-Policies auf RentCore-Tabellen (erweitern, nicht ersetzen)
- Bestehende Buchungslogik für direkte/Widget-Buchungen

### Naming
- User-facing: "Lociva" (nicht RentCore/VeloRent)
- Code-intern: Bestehende Strukturen beibehalten (keine unnötigen Umbenennungen)
- `src/views/` statt `src/pages/` (vermeidet Next.js Pages Router Konflikt)
- `navigationItems.js` = Single Source of Truth für Sidebar

### Env Vars
```
NEXT_PUBLIC_SUPABASE_URL=        # Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase Anon Key
STRIPE_SECRET_KEY=               # Stripe Secret (server-side only)
STRIPE_WEBHOOK_SECRET=           # Stripe Webhook Signing Secret

# Edge Function Secrets (im Supabase Dashboard):
BREVO_API_KEY=
FROM_EMAIL=
FROM_NAME=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

## Testdaten

`supabase/seed-testdata.sql` enthält Testdaten für die Entwicklung:
- Regionen (Rhein-Main, Bodensee, Schwarzwald)
- Hotels mit Slugs
- Hotel-Provider Zuordnungen
- Analytics Events

Ausführen: Supabase SQL Editor → `supabase/seed-testdata.sql`
