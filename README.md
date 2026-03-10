# RentCore

Cloud-basierte SaaS-Plattform für Fahrradvermietungen — Hotels, Pensionen, Fahrradläden.

**Produktion:** https://www.rentcore.de

## Features

- **Buchungskalender** — Gantt-Ansicht mit Drag & Drop, Tages-/Wochen-/Monatsansicht, mobil-optimiert
- **Buchungsverwaltung** — 4-Schritt-Wizard, Konfliktprüfung, Gruppenbuchungen (mehrere Räder)
- **Übergabe-/Rückgabe-Protokoll** — HandoverModal mit Akkustand, Schadensdokumentation, strukturiertes JSONB-Protokoll
- **Kautionstracking** — Status `pending → held → refunded/deducted` pro Buchung
- **Add-ons / Zubehör** — Helme, Schlösser etc. mit `per_day`- oder Pauschalpreisen, wählbar im Buchungsformular
- **Kundenverwaltung** — Schnell-Check-in, Kundenhistorie, Ausweis-Nr.
- **Rechnungen** — PDF-Generierung (jsPDF), Status-Tracking, org-scoped sequentielle Nummern
- **Wartungsprotokoll** — Wartungsblöcke pro Fahrrad mit Kalenderintegration und Auto-Reset
- **Dashboard** — Umsatzchart (Recharts), Aktivitätsfeed, Tagesübergaben, Zeitraum-Filter
- **Preisregeln** — Dynamische Preise (Saisonzuschlag, Rabatte) mit Regelwerk-Engine
- **Vouchers / Rabattcodes** — Prozentual oder absolut, einmalig oder mehrfach
- **Buchungs-Widget** — Einbettbares Selbstbuchungsformular (iframe) für eigene Website
- **E-Mail-Benachrichtigungen** — Buchungsbestätigung, Übergabe, Rückgabe via Brevo
- **Multi-Mandant** — Mehrere Organisationen, Rollenverwaltung (Owner / Admin / Member / **Viewer**)
- **Viewer-Rolle** — Leserechte ohne Schreibrechte per RLS (`get_user_write_org_ids()`)
- **DSGVO Cookie-Banner** — Einwilligungsmanagement mit Timestamp-Audit-Trail
- **Dark Mode** — Persistenter Dark/Light-Mode
- **Mobile-optimiert** — Responsive auf allen Breakpoints (sm/md/lg), `dvh`, 44px Touch-Targets

## Stack

| Schicht | Technologie |
|---------|-------------|
| Frontend | Next.js 15 (App Router), React 18, Tailwind CSS v3 |
| Backend/DB | Supabase (PostgreSQL + Auth + RLS + Edge Functions) |
| PDF | jsPDF + jspdf-autotable |
| Charts | Recharts |
| Drag & Drop | @dnd-kit |
| E-Mail | Brevo Transactional API |
| Deployment | Vercel |

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
```

### 3. Datenbank einrichten

Im Supabase SQL Editor **in dieser Reihenfolge** ausführen:

```
1. supabase/supabase-schema.sql          — Kerntabellen + RLS
2. supabase/supabase-public-booking.sql  — Buchungs-Widget API
3. supabase/missing-tables.sql           — Ergänzende Tabellen (invoices, maintenance_logs, add_ons, bike_categories, vouchers, booking_history)
4. supabase/group-bookings.sql           — booking_items (Gruppenbuchungen)
5. supabase/booking-addons.sql           — booking_addons Junction-Tabelle
6. supabase/handover-protocol.sql        — Übergabe-Protokoll-Spalten (pickup/return_protocol, deposit_status)
7. supabase/fix-viewer-rls.sql           — Viewer-Rolle RLS (split SELECT / write policies)
```

### 4. E-Mail Edge Function deployen (optional)

Secrets im Supabase Dashboard → Edge Functions → Secrets:
- `BREVO_API_KEY`
- `FROM_EMAIL`
- `FROM_NAME`

```bash
SUPABASE_ACCESS_TOKEN=xxx npx supabase functions deploy send-email --project-ref YOUR_PROJECT_REF
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

| Tabelle | Beschreibung |
|---------|-------------|
| `organizations` | Mandanten (Hotels, Verleiher) |
| `profiles` | Benutzerprofile |
| `organization_members` | User ↔ Org (Rollen: owner, admin, member, viewer) |
| `bikes` | Fahrräder / Mietobjekte |
| `bike_categories` | Kategorien (E-Bike, MTB, Trekking, …) |
| `customers` | Endkunden |
| `bookings` | Buchungen (inkl. pickup/return_protocol JSONB, deposit_status) |
| `booking_items` | Zusätzliche Räder bei Gruppenbuchungen |
| `booking_addons` | Ausgewählte Add-ons pro Buchung (Junction-Tabelle) |
| `booking_history` | Änderungsprotokoll |
| `invoices` | Rechnungen |
| `maintenance_logs` | Wartungsprotokoll |
| `add_ons` | Zusatzartikel (Helme, Schlösser, …) mit Preistyp |
| `vouchers` | Rabattgutscheine |
| `public_booking_settings` | Widget-Konfiguration pro Organisation |

## Verzeichnisstruktur

```
app/                        # Next.js App Router
├── layout.jsx              # Root-Layout (AuthProvider, CookieBanner)
├── page.jsx                # Landing Page
├── login/ signup/          # Auth-Seiten
└── app/                    # Geschützter Bereich (/app/*)
    ├── layout.jsx          # OrgProvider > AppProvider > DataProvider > Sidebar + Header
    └── [feature]/page.jsx  # Re-exports aus src/views/

src/
├── views/                  # Seiten-Komponenten
├── components/             # UI-Komponenten (alle "use client")
├── context/                # React Contexts (App, Auth, Org, Data)
├── hooks/                  # Daten-Hooks (useBookings, useBikes, …)
└── utils/
    ├── supabase.js         # Browser-Client (Singleton)
    ├── supabase/server.js  # Server-Client (Middleware)
    ├── formatters.js       # Datum/Währungs-Hilfsfunktionen
    └── navigationItems.js  # Sidebar-Navigation

supabase/
├── supabase-schema.sql          # Haupt-Schema + RLS
├── supabase-public-booking.sql  # Widget-API Erweiterung
├── missing-tables.sql           # Ergänzende Tabellen
├── group-bookings.sql           # booking_items (Gruppenbuchungen)
├── booking-addons.sql           # booking_addons Junction-Tabelle
├── handover-protocol.sql        # Übergabe-/Rückgabe-Protokoll-Spalten
├── fix-viewer-rls.sql           # Viewer-Rolle RLS-Policies
└── functions/send-email/        # Brevo E-Mail Edge Function
```

## Architektur-Hinweise

- Alle `src/`-Komponenten sind Client Components (`"use client"`)
- Provider-Hierarchie: `AuthProvider` → `OrgProvider` → `AppProvider` → `DataProvider`
- `daysDiff(a, b)` in `formatters.js` gibt inklusiven Tagescount zurück (+1 bereits eingebaut) — **kein zusätzliches +1 an Aufrufstellen**
- Multi-Tenancy via Supabase RLS — alle Tabellen nach `organization_id` gefiltert
- Auth: `signIn`/`signUp` werfen Fehler direkt (kein `{ error }`-Destructuring — `try/catch` verwenden)
- Buchungs-Widget ist isoliert von der Auth und nutzt einen separaten API-Key (`public_api_key`)
- Viewer-Rolle: `get_user_write_org_ids()` gibt nur Org-IDs zurück, wo User ≠ viewer — alle Write-Policies nutzen diese Funktion

## Roadmap

- [ ] Stripe Payments (Anzahlung bei Buchung)
- [ ] Booking.com / Channel Manager Integration
- [ ] Mobile App (React Native)
- [ ] Mehrsprachigkeit (i18n)
