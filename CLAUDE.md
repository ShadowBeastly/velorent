# CLAUDE.md

## Was Lociva ist

Lociva ist ein hyperlokal-Aktivitätsmarktplatz. QR-Codes in Unterkünften bringen Gästen lokale Buchungsangebote direkt ins Zimmer — ohne Login, in 60 Sekunden buchbar.

**Lociva verdient 5–15% Provision pro Buchung.** Alles läuft über Lociva (eine Transaktion), Lociva zahlt den Anbieter aus.

## Die vier Akteure

**Gast** — scannt QR, sieht hyperlokale Angebote, bucht und zahlt über Lociva. Kein Account.

**Aktivitätsanbieter** — Fahrradverleih, Escape Room, Weinverkostung, Restaurant etc. Verwaltet Angebot + Kapazitäten über RentCore. Bekommt Auszahlung von Lociva abzgl. Provision.

**Unterkunft** — Hotel, Motel, Airbnb, Ferienwohnung, Campingplatz. Legt QR-Code aus. Bekommt nichts bezahlt — Mehrwert ist der Service für ihre Gäste. Hotels/Motels werden vom Admin eingepflegt, Airbnbs/Ferienwohnungen per Self-Service.

**Platform (Superadmin)** — pflegt Hotels/Motels ein, verwaltet Anbieter, Regionen, Analytics.

## Was RentCore ist

RentCore ist eine eigenständige Vermiet- und Buchungssoftware für lokale Aktivitätsanbieter. Aktuell Fahrrad/E-Bike, später Kanu, Quad, Töpferkurs, alles was Kapazitäten und Buchungen braucht. Anbieter bekommen auch ein Widget für ihre eigene Website.

RentCore ist aktuell die einzige Supply-Quelle für Lociva — das wird sich ändern. Langfristig nutzen alle Lociva-Anbieter RentCore, egal welcher Typ.

**RentCore und Lociva sind zwei eigenständige Produkte in einer Codebase.**

## Domains

- `rentcore.de` — RentCore Provider-Dashboard (`/app/*`) + Landingpage
- `lociva.de` — Gast-Marktplatz + Unterkunfts-Dashboard + Lociva-Landingpage

`proxy.ts` schreibt `lociva.de/` → `/lociva` um (Next.js 16, exportiert `proxy`).

## Nutzerrollen im System

| Rolle | Zugang | Wer |
|-------|--------|-----|
| `superadmin` | `/app/admin/*` | Lociva-Mitarbeiter, pflegt Hotels/Anbieter ein |
| org member | `/app/*` | RentCore-Anbieter (owner/admin/member/viewer) |
| `hotel` | `/hotel/*` | Unterkunfts-Dashboard (read-only Buchungsstatistiken) |
| Gast | `/hotel/[slug]` | Kein Login, bucht direkt |

## Technische Kernregeln

**Buchungslogik gehört nie in Client-Code** — immer in Supabase RPCs oder Edge Functions.

**Kritische RPCs:**
- `create_guest_booking` — Provision wird hier berechnet
- `cancel_booking_by_token` — Storno: >24h=100% zurück, <24h=50% Gebühr, No-Show=0%
- `get_hotel_with_providers`, `get_booking_by_token`, `get_hotel_analytics`, `track_analytics_event`

**Provider-Hierarchie in `/app/*`:**
```
AuthProvider → OrgProvider → AppProvider → DataProvider → AppShell
```

**Auth:**
- `signIn` / `signUp` werfen Fehler — immer `try/catch`
- Sign-out → `window.location.href = "/login"` (hard reload, resettet allen React-State)
- Gast-Flow: vollständig unauthentifiziert, anon key RPCs

**Navigation:**
- RentCore: `src/utils/navigationItems.js`
- Lociva: `src/utils/locivaNavigationItems.js`
- Nie duplizieren.

## Gotchas

- `daysDiff(a, b)` ist bereits inklusiv (+1 eingebaut) — kein weiteres +1
- `currentOrgId` in `localStorage`
- Booking-Widget nutzt separaten `public_api_key`, isoliert von Auth
- `app/layout.jsx` braucht `export const dynamic = "force-dynamic"`
- `src/utils/supabase.js` braucht `|| "placeholder"` Fallbacks
- `outputDirectory` in Vercel muss `null` sein
- Alle `src/`-Komponenten sind Client Components (`"use client"`)

## Env vars

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_DEMO_EMAIL
NEXT_PUBLIC_DEMO_PASSWORD
```
Edge Function secrets: `BREVO_API_KEY`, `FROM_EMAIL`, `FROM_NAME`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS v3, Supabase, Stripe Connect, Brevo, Vercel
