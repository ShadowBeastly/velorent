# AGENTS.md

Read CLAUDE.md first. This file adds agent-specific guidance.

## Commands

```bash
npm run dev       # localhost:3000
npm run build     # ESLint + type check + build
npm run lint
npm test          # node --test (formatters, price calc, CSV export)
```

## Where things live

```
app/
  layout.jsx              # Root: AuthProvider + I18nProvider + CookieBanner
  page.jsx                # RentCore landing (rentcore.de)
  lociva/page.jsx         # Lociva landing (lociva.de — rewritten by proxy.ts)
  demo/page.jsx           # Auto-login + redirect by profile.role
  hotel/[slug]/           # Public guest booking (no auth)
  hotel/(dashboard)/      # Lociva hotel dashboard shell + routes
  app/layout.jsx          # OrgProvider > AppProvider > DataProvider > AppShell
  app/admin/              # Superadmin only
  api/stripe/webhook/     # Stripe webhook
  api/booking/            # Public booking API (anon)
proxy.ts                  # Auth guards + hostname routing (Next.js 16, exports `proxy`)
src/
  views/                  # Page-level components
  components/             # UI (all "use client")
  context/                # AuthContext, OrgContext, AppContext, DataContext
  hooks/                  # useProvideAuth, useProvideOrg, useBookings, useBikes, ...
  utils/
    supabase.js           # Browser client singleton (keep || "placeholder" fallbacks)
    navigationItems.js    # RentCore sidebar — single source of truth
    locivaNavigationItems.js  # Lociva sidebar — single source of truth
supabase/migrations/      # Run in order 001 → 20260327_*
supabase/functions/       # Edge Functions (email, stripe, delete-account)
```

## Context hierarchy (`/app/*`)

```
AuthProvider → OrgProvider → AppProvider → DataProvider → AppShell
```

- `useAuth()` — user, profile, loading, signIn, signOut, signUp
- `useOrganization()` — organizations, currentOrg, switchOrg
- `useData()` — bikes, bookings, customers, invoices, etc.

## Roles

| Role | Route access |
|------|-------------|
| `superadmin` | `/app/admin/*` + all `/app/*` |
| org member | `/app/*` (org-scoped via RLS) |
| `hotel` | `/hotel/*` dashboard |
| guest | `/hotel/[slug]` only, no login |

Viewer org members are read-only. Don't gate on role alone — rely on RLS + `get_user_write_org_ids()`.

## Rules

**Do:**
- Put commission/refund/booking logic in Supabase RPCs, never in client code
- Extend existing hooks, don't create parallel ones
- Use `try/catch` for `signIn` / `signUp` (they throw, not `{ error }`)
- New Lociva nav items → `locivaNavigationItems.js`; RentCore → `navigationItems.js`
- New migrations → `supabase/migrations/YYYYMMDD_description.sql`

**Don't:**
- Don't rename `proxy.ts` back to `middleware.ts` or change export name from `proxy`
- Don't add `+1` to date durations — `daysDiff()` is already inclusive
- Don't call `redirect()` from a Client Component
- Don't touch `|| "placeholder"` in `supabase.js` — build will break
- Don't remove `export const dynamic = "force-dynamic"` from `app/layout.jsx`
- Don't move `currentOrgId` out of localStorage without updating all consumers
