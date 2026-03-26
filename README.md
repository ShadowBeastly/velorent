# Lociva

Lokale Aktivitäten-Plattform für Hotelgäste. Hotels platzieren QR-Codes in Zimmern, Gäste scannen und buchen Fahrräder, E-Bikes und Erlebnisse bei lokalen Anbietern — Bezahlung über Stripe Connect.

**Produktion:** https://www.lociva.de
**Provider-Dashboard:** https://www.rentcore.de

## Wie es funktioniert

1. **Hotel** platziert QR-Code im Zimmer (kostenlos)
2. **Gast** scannt → sieht lokale Anbieter → bucht und zahlt online
3. **Anbieter** erhält automatische Auszahlung (abzgl. 5-15% Provision)

Lociva verdient Provision pro Buchung. Drei Nutzertypen: Gäste (ohne Login), Anbieter (Provider-Dashboard), Hotels (Read-only Dashboard), Platform-Admin.

## Features

### Gast-Buchungsflow (ohne Login)
- QR-Code → `/hotel/[slug]` → Anbieter-Übersicht → Buchung → Stripe Checkout
- Bestätigungs-E-Mail mit Stornierungslink (DE/EN)
- Selbstservice-Stornierung: >24h kostenlos, <24h 50%, No-Show 100%

### Anbieter-Dashboard (RentCore)
- Buchungskalender (Gantt, Drag & Drop, Tages-/Wochen-/Monatsansicht)
- 4-Schritt-Buchungswizard mit Konfliktprüfung, Gruppenbuchungen
- Übergabe-/Rückgabe-Protokoll mit Schadensdokumentation
- Kautionstracking (pending → held → refunded/deducted)
- Stripe Connect Express Onboarding (KYC)
- AGB-Akzeptanz + Marketplace-Ansicht
- Kunden-, Rechnungs-, Wartungsverwaltung
- Add-ons, Preisregeln, Vouchers, Buchungs-Widget
- E-Mail-Benachrichtigungen (Brevo)

### Hotel-Dashboard
- Buchungsstatistiken (Read-only)
- QR-Code Download

### Admin-Panel
- Hotels, Anbieter, Regionen, Scouts verwalten
- QR-Code Generator pro Hotel
- Hotel ↔ Anbieter Zuordnung
- Plattform-Analytics

### Allgemein
- Multi-Mandant (RLS, Rollen: Owner / Admin / Member / Viewer)
- Zweisprachig (DE / EN)
- Dark Mode, responsive, mobile-optimiert
- DSGVO Cookie-Banner mit Audit-Trail
- PDF-Rechnungen / Verträge (jsPDF)

## Stack

| Schicht | Technologie |
|---------|-------------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v3 |
| Backend/DB | Supabase (PostgreSQL + Auth + RLS + Edge Functions) |
| Zahlungen | Stripe Connect (Express) |
| QR-Codes | qrcode |
| PDF | jsPDF + jspdf-autotable |
| Charts | Recharts |
| Drag & Drop | @dnd-kit |
| E-Mail | Brevo Transactional API |
| i18n | Custom I18nProvider (DE / EN) |
| Deployment | Vercel |
| CI | GitHub Actions (lint + build + test) |

## Schnellstart

### 1. Abhängigkeiten installieren

```bash
npm install
```

### 2. Umgebungsvariablen setzen

`.env.local` erstellen:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Datenbank einrichten

Alle Migrations in `supabase/migrations/` der Reihe nach im Supabase SQL Editor ausführen (001 → 20260327). Die Legacy-Skripte `supabase-schema.sql` und `supabase-public-booking.sql` sind bereits in den Migrations enthalten.

### 4. Edge Functions deployen

Secrets im Supabase Dashboard → Edge Functions → Secrets:
- `BREVO_API_KEY`, `FROM_EMAIL`, `FROM_NAME`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

```bash
# Alle Edge Functions deployen
SUPABASE_ACCESS_TOKEN=xxx npx supabase functions deploy --project-ref YOUR_PROJECT_REF
```

### 5. Entwicklungsserver starten

```bash
npm run dev   # http://localhost:3000
```

## Befehle

```bash
npm run dev     # Dev-Server starten
npm run build   # Produktions-Build (ESLint + TypeCheck)
npm run lint    # ESLint
npm run start   # Produktionsserver (nach build)
npm test        # Unit-Tests (formatters, calculatePrice, exportCSV)
```

## Deployment (Vercel)

```bash
vercel --prod
```

**Wichtige Constraints:**
- `app/layout.jsx` muss `export const dynamic = "force-dynamic"` haben — verhindert statische Generierung von `/_not-found`, die Supabase SSR-Cookie-Lesen bricht
- `src/utils/supabase.js` benötigt `|| "placeholder"` Fallbacks — `createBrowserClient` wirft synchron wenn URL/Key leer sind
- `outputDirectory` im Vercel-Projekt muss `null` (nicht leer) sein — sonst überspringt Vercel den Build

## Datenbank-Tabellen

### RentCore (Provider)

| Tabelle | Beschreibung |
|---------|-------------|
| `organizations` | Mandanten + Stripe Connect Felder |
| `profiles` | Benutzerprofile (inkl. `role` für platform_admin) |
| `organization_members` | User ↔ Org (Rollen: owner, admin, member, viewer) |
| `bikes` | Fahrräder / Mietobjekte |
| `bike_categories` | Kategorien (E-Bike, MTB, Trekking, …) |
| `customers` | Endkunden |
| `bookings` | Buchungen (+ Marketplace-Felder: hotel_id, stripe_*, commission, cancellation) |
| `booking_items` | Zusätzliche Räder bei Gruppenbuchungen |
| `booking_addons` | Ausgewählte Add-ons pro Buchung |
| `booking_history` | Änderungsprotokoll |
| `invoices` | Rechnungen |
| `maintenance_logs` | Wartungsprotokoll |
| `add_ons` | Zusatzartikel (Helme, Schlösser, …) |
| `vouchers` | Rabattgutscheine |
| `public_booking_settings` | Widget-Konfiguration pro Organisation |

### Lociva (Marketplace)

| Tabelle | Beschreibung |
|---------|-------------|
| `regions` | Regionen (Rhein-Main, Bodensee, …) + Scout-Zuordnung |
| `hotels` | Hotels mit Slug, Geo-Koordinaten, QR-Code URL |
| `hotel_providers` | Hotel ↔ Anbieter Zuordnung (N:M) |
| `hotel_users` | Hotel ↔ User Zuordnung (für Hotel-Dashboard) |
| `analytics_events` | QR-Scans, Seitenaufrufe, Buchungsfunnel |

## Verzeichnisstruktur

```
app/                        # Next.js App Router
├── layout.jsx              # Root: AuthProvider + I18nProvider + CookieBanner
├── page.jsx                # Landing Page
├── hotel/[slug]/           # Gast-Buchungsflow (öffentlich)
├── api/                    # Stripe + Booking API Routes
└── app/                    # Geschützter Bereich (/app/*)
    ├── layout.jsx          # OrgProvider > AppProvider > DataProvider > AppShell
    ├── [feature]/page.jsx  # Re-exports aus src/views/
    └── admin/              # Platform-Admin (hotels, providers, regions, analytics)

src/
├── views/                  # Seiten-Komponenten
├── components/             # UI-Komponenten (alle "use client")
├── context/                # React Contexts (Auth, Org, App, Data)
├── hooks/                  # Daten-Hooks (useBookings, useBikes, …)
└── utils/                  # Supabase-Client, i18n, Formatter, Navigation

supabase/
├── migrations/             # Kanonische Migrationen (001, 002)
├── functions/              # Edge Functions (email, stripe-*, delete-account)
└── *.sql                   # Legacy-Migrationsskripte

branding/                   # Logo-SVGs + Brand Guide
```

## Architektur-Hinweise

- Alle `src/`-Komponenten sind Client Components (`"use client"`)
- Provider-Hierarchie: `AuthProvider` → `OrgProvider` → `AppProvider` → `DataProvider`
- `daysDiff(a, b)` in `formatters.js` gibt inklusiven Tagescount zurück (+1 bereits eingebaut) — **kein zusätzliches +1**
- Multi-Tenancy via Supabase RLS — Providerdaten nach `organization_id`, Lociva-Tabellen nach `is_platform_admin()`
- Auth: `signIn`/`signUp` werfen Fehler direkt — `try/catch` verwenden
- Gast-Buchungsflow ist vollständig unauthentifiziert — nutzt RPCs mit `anon` Key
- Commission-Logik liegt in der `create_guest_booking` RPC
- Buchungs-Widget ist isoliert von Auth, nutzt separaten `public_api_key`
