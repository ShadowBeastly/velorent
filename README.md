# VeloRent Pro — Cloud SaaS für Fahrradvermietung

Multi-Tenant SaaS für Fahrradverleiher, Hotels und Tourismusbetriebe.

## Stack

- **Next.js 15** (App Router) + React 18
- **Supabase** (PostgreSQL + Auth + Row Level Security)
- **Tailwind CSS v3**
- **Vercel** (Deployment)

## Setup

### 1. Supabase Projekt erstellen

1. [supabase.com](https://supabase.com) → New Project
2. SQL Editor → `supabase-schema.sql` ausführen
3. SQL Editor → `supabase-public-booking.sql` ausführen
4. Authentication → Providers → Email aktivieren
5. Settings → API → URL und Anon Key kopieren

### 2. Environment Variables

`.env` erstellen (siehe `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3. Lokal starten

```bash
npm install
npm run dev
```

### 4. Deployment (Vercel)

```bash
vercel --prod
```

Environment Variables in Vercel Dashboard eintragen (gleiche wie `.env`).

---

## Features

- Multi-Tenant Architektur (jeder Kunde = eigene Organisation)
- Buchungskalender mit Drag & Drop (Gantt-Ansicht)
- Flottenmanagement (Bikes, Kategorien, Wartung)
- Kundenverwaltung (CRM)
- Rechnungen mit PDF-Export
- Öffentliches Buchungswidget (einbettbar auf Hotel-Website)
- Add-ons, Gutscheine, Wartungsblöcke
- Dark Mode

## Datenbank-Tabellen

| Tabelle | Beschreibung |
|---|---|
| `organizations` | Tenants (Hotels, Verleiher) |
| `profiles` | User-Profile |
| `organization_members` | User ↔ Org (Rollen: owner, admin, member, viewer) |
| `bikes` | Fahrräder/Mietobjekte |
| `bike_categories` | Kategorien (E-Bike, MTB, etc.) |
| `customers` | Endkunden |
| `bookings` | Buchungen |
| `invoices` | Rechnungen |
| `maintenance_blocks` | Wartungssperren |
| `add_ons` | Zusatzartikel (Helme, Schlösser, etc.) |
| `vouchers` | Rabattgutscheine |

## Buchungswidget

Hotels können ein Iframe-Widget auf ihrer Website einbetten:

1. Dashboard → Einstellungen → Widget aktivieren
2. Einbettungscode kopieren
3. Auf Hotel-Website einfügen

Siehe `widget-embed-example.html` für ein vollständiges Beispiel.

## Nächste Schritte (Roadmap)

- [ ] E-Mail-Benachrichtigungen (Buchungsbestätigung via Resend)
- [ ] Stripe Payments
- [ ] Booking.com Integration
