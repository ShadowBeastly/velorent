# VeloRent Pro

Cloud-basierte SaaS-Plattform für Fahrradvermietungen — Hotels, Pensionen, Fahrradläden.

## Features

- **Buchungskalender** — Gantt-Ansicht mit Drag & Drop, Tages-/Wochen-/Monatsansicht
- **Buchungsverwaltung** — 4-Schritt-Wizard, Konfliktprüfung, Übergabe-/Rückgabe-Workflow mit HandoverModal
- **Kundenverwaltung** — Schnell-Check-in, Kundenhistorie, Ausweis-Nr.
- **Rechnungen** — PDF-Generierung (jsPDF), Status-Tracking (Entwurf → Versendet → Bezahlt), sequentielle Nummern
- **Wartungsprotokoll** — Wartungsblöcke pro Fahrrad mit Kalenderintegration
- **Dashboard** — Umsatzchart (Recharts), Aktivitätsfeed, Tagesübergaben
- **Buchungs-Widget** — Einbettbares Selbstbuchungsformular (iframe) für eigene Website
- **E-Mail-Benachrichtigungen** — Buchungsbestätigung, Übergabe, Rückgabe via Brevo
- **Multi-Mandant** — Mehrere Organisationen, Rollenverwaltung (Owner/Admin/Member/Viewer)
- **DSGVO Cookie-Banner** — Einwilligungsmanagement mit localStorage
- **Dark Mode** — Persistenter Dark/Light-Mode

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

Im Supabase SQL Editor in dieser Reihenfolge ausführen:

```
1. supabase/supabase-schema.sql          — Kerntabellen + RLS
2. supabase/supabase-public-booking.sql  — Buchungs-Widget API
3. supabase/missing-tables.sql           — Ergänzende Tabellen (invoices, maintenance_logs, add_ons, bike_categories, vouchers, booking_history)
```

### 4. E-Mail Edge Function deployen (optional)

Secrets im Supabase Dashboard → Edge Functions → Secrets setzen:
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
# Stale Output löschen, dann deployen
rm -rf .vercel/output
vercel --prod
```

**Wichtig:** `outputDirectory` im Vercel-Projekt muss `null` (nicht leer) sein — sonst überspringt Vercel den Build.

## Datenbank-Tabellen

| Tabelle | Beschreibung |
|---------|-------------|
| `organizations` | Mandanten (Hotels, Verleiher) |
| `profiles` | Benutzerprofile |
| `organization_members` | User ↔ Org (Rollen: owner, admin, member, viewer) |
| `bikes` | Fahrräder / Mietobjekte |
| `bike_categories` | Kategorien (E-Bike, MTB, Trekking, …) |
| `customers` | Endkunden |
| `bookings` | Buchungen |
| `booking_history` | Änderungsprotokoll |
| `invoices` | Rechnungen |
| `maintenance_logs` | Wartungsprotokoll |
| `add_ons` | Zusatzartikel (Helme, Schlösser, …) |
| `vouchers` | Rabattgutscheine |
| `public_booking_settings` | Widget-Konfiguration pro Organisation |

## Verzeichnisstruktur

```
app/                        # Next.js App Router
├── layout.jsx              # Root-Layout (AuthProvider, CookieBanner)
├── page.jsx                # Landing Page
├── login/ signup/          # Auth-Seiten
├── not-found.jsx           # 404-Seite
├── error.jsx               # 500-Fehlerseite
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
└── functions/send-email/        # Brevo E-Mail Edge Function
```

## Architektur-Hinweise

- Alle `src/`-Komponenten sind Client Components (`"use client"`)
- Provider-Hierarchie: `AuthProvider` → `OrgProvider` → `AppProvider` → `DataProvider`
- `daysDiff(a, b)` in `formatters.js` gibt inklusiven Tagescount zurück (+1 bereits eingebaut) — **kein zusätzliches +1 an Aufrufstellen**
- Multi-Tenancy via Supabase RLS — alle Tabellen nach `organization_id` gefiltert
- Auth: `signIn`/`signUp` werfen Fehler direkt (kein `{ error }`-Destructuring — `try/catch` verwenden)
- Buchungs-Widget ist isoliert von der Auth und nutzt einen separaten API-Key (`public_api_key`)

## Roadmap

- [ ] Stripe Payments (Anzahlung bei Buchung)
- [ ] Booking.com / Channel Manager Integration
- [ ] Mobile App (React Native)
- [ ] Mehrsprachigkeit (i18n)
