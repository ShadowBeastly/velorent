# AGENTS.md

Read CLAUDE.md first — dort ist das Produkt und die Logik erklärt.

## Commands

```bash
npm run dev       # localhost:3000
npm run build     # ESLint + type check + build
npm run lint
npm test          # node --test
```

## Wo was liegt

```
app/
  layout.jsx              # Root: AuthProvider + I18nProvider + CookieBanner
  page.jsx                # RentCore Landing (rentcore.de)
  lociva/page.jsx         # Lociva Landing (lociva.de — via proxy.ts rewrite)
  demo/page.jsx           # Auto-Login + Redirect nach profile.role
  hotel/[slug]/           # Gast-Buchungsflow (kein Auth)
  hotel/(dashboard)/      # Unterkunfts-Dashboard (role: hotel)
  app/layout.jsx          # OrgProvider > AppProvider > DataProvider > AppShell
  app/admin/              # Superadmin only
  api/stripe/webhook/     # Stripe Webhook
  api/booking/            # Public Booking API (anon key)
proxy.ts                  # Auth Guards + Hostname-Routing (Next.js 16, export: `proxy`)
src/
  views/                  # Seiten-Komponenten
  components/             # UI (alle "use client")
  context/                # AuthContext, OrgContext, AppContext, DataContext
  hooks/                  # useProvideAuth, useProvideOrg, useBookings, useBikes, ...
  utils/
    supabase.js           # Browser Client Singleton (|| "placeholder" Fallbacks lassen)
    navigationItems.js    # RentCore Sidebar — single source of truth
    locivaNavigationItems.js  # Lociva Sidebar — single source of truth
supabase/migrations/      # In Reihenfolge ausführen: 001 → 20260327_*
supabase/functions/       # Edge Functions (Email, Stripe, Delete-Account)
```

## Kontext-Hierarchie (`/app/*`)

```
AuthProvider → OrgProvider → AppProvider → DataProvider → AppShell
```

- `useAuth()` — user, profile, loading, signIn, signOut, signUp
- `useOrganization()` — organizations, currentOrg, switchOrg
- `useData()` — bikes, bookings, customers, invoices, etc.

## Rollen

| Rolle | Route | Wer |
|-------|-------|-----|
| `superadmin` | `/app/admin/*` + `/app/*` | Lociva-Mitarbeiter |
| org member | `/app/*` (org-scoped) | RentCore-Anbieter |
| `hotel` | `/hotel/*` | Unterkunfts-Partner (read-only) |
| Gast | `/hotel/[slug]` | Kein Login |

Viewer-Member sind read-only — nicht auf Rolle allein verlassen, RLS nutzen.

## Regeln

**Tun:**
- Buchungs-/Provisions-/StornoLogik → Supabase RPCs, nie Client-Code
- Bestehende Hooks erweitern, keine neuen parallel erstellen
- `try/catch` für `signIn` / `signUp` (die werfen, kein `{ error }`)
- Neue Lociva-Nav-Items → `locivaNavigationItems.js`
- Neue RentCore-Nav-Items → `navigationItems.js`
- Neue Migrations → `supabase/migrations/YYYYMMDD_beschreibung.sql`

**Nicht tun:**
- `proxy.ts` nicht in `middleware.ts` umbenennen, Export bleibt `proxy`
- Kein zusätzliches +1 bei Datumsdauern — `daysDiff()` ist bereits inklusiv
- Kein `redirect()` aus Client Components
- `|| "placeholder"` in `supabase.js` nicht anfassen
- `export const dynamic = "force-dynamic"` in `app/layout.jsx` nicht entfernen
- `currentOrgId` bleibt in localStorage — nicht ohne alle Consumer anpassen
- Hotel-User gehören auf `/hotel/*`, nicht auf `/app/*`
