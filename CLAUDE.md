# CLAUDE.md — Lociva Platform Context

## Product Overview

**funk-e.solutions** (Christopher Funke) runs two products in one monorepo:

- **RentCore** — B2B SaaS booking software for rental/activity operators (bikes, canoes, ski, etc.) — rentcore.de
- **Lociva** — Marketplace where hotel guests book local activities via QR code — lociva.de

RentCore = operating system for providers. Lociva = hotel distribution channel on top. Sold independently; Lociva is an upsell during RentCore onboarding.

**Guest flow:** QR code in hotel room → `/hotel/[slug]` → browse → book → Stripe Checkout → confirmation email. No login required.
**Commission:** 5% bikes, 10-12% experiences, 15% premium — hardcoded in `create_guest_booking` RPC.
**Cancellation:** >24h = 100% refund, <24h = 50% fee, no-show = 100% charged — token-based self-service via `/hotel/[slug]/cancel?token=UUID`.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 18, Tailwind CSS v3 |
| Backend/DB | Supabase (PostgreSQL + Auth + RLS + Edge Functions) |
| Payments | Stripe Connect (Express accounts) |
| Email | Brevo Transactional API (via Supabase Edge Function) |
| i18n | Custom I18nProvider (DE / EN) |
| Deployment | Vercel |

---

## Directory Structure

```
app/                        # Next.js App Router
├── layout.jsx              # Root: AuthProvider + I18nProvider + CookieBanner
├── page.jsx                # Landing page (redirects /app if logged in)
├── hotel/[slug]/
│   ├── page.jsx            # HotelLandingPage — public guest booking flow
│   └── cancel/page.jsx     # GuestCancelPage — token-based cancellation
├── api/
│   ├── booking/public/route.js   # GET (lookup by token) + POST (cancel + refund)
│   └── stripe/
│       ├── checkout/route.ts     # → stripe-checkout Edge Function
│       ├── cancel/route.ts       # → stripe-cancel Edge Function
│       ├── connect/route.ts      # → stripe-connect Edge Function
│       └── webhook/route.js      # Stripe webhook handler
└── app/                    # Protected area — all routes at /app/*
    ├── layout.jsx          # OrgProvider > AppProvider > DataProvider > AppShell
    ├── bookings/ calendar/ categories/ customers/ fleet/ invoices/
    ├── addons/ maintenance/ pricing/ vouchers/ settings/
    ├── marketplace/        # Provider Stripe Connect + AGB + hotel bookings
    ├── hotel-stats/        # Hotel read-only dashboard
    └── admin/              # superadmin only: hotels/ providers/ regions/ analytics/

src/
├── views/                  # Page components ("views" to avoid Pages Router conflict)
├── components/             # UI components, all "use client"
├── context/                # AuthContext, OrgContext, AppContext, DataContext
├── hooks/                  # useBookings, useBikes, useCustomers, etc.
└── utils/
    ├── supabase.js         # Browser client (singleton)
    ├── supabase/server.js  # Server client (middleware.ts only)
    ├── i18n/               # DE/EN translations + I18nProvider
    ├── formatters.js       # Date/currency helpers
    ├── calculatePrice.js   # Price calculation engine
    └── navigationItems.js  # Sidebar nav — single source of truth

supabase/
├── migrations/
│   ├── 001_lociva_extension.sql   # Lociva tables + RPCs + RLS
│   └── 002_cancellation_token.sql # Cancellation token + RPCs
└── functions/
    ├── send-email/         # Brevo booking confirmation email
    ├── stripe-checkout/    # Checkout session creation
    ├── stripe-webhook/     # Stripe event handling
    ├── stripe-cancel/      # Full/partial refunds
    ├── stripe-connect/     # Express account creation
    └── delete-account/     # User account deletion

middleware.ts               # /app/* requires session; /login /signup redirect if logged in
```

---

## Context / Data Flow

Provider hierarchy (inside `/app/*` only):

```
AuthProvider (app/layout.jsx — root)
  └── OrgProvider          (app/app/layout.jsx)
       └── AppProvider     (dark mode, sidebar state, search query)
            └── DataProvider  (org data: bikes, bookings, customers, invoices, etc.)
```

- `useAuth()` — session, user, profile (incl. `role`), signIn/signOut/signUp
- `useOrganization()` — organizations[], currentOrg, switchOrg, createOrganization
- `useApp()` — darkMode, sidebarOpen, searchQuery
- `useData()` — bikes, bookings, customers, invoices, categories, addons, maintenance, vouchers, notifications

**Org guard:** `app/app/layout.jsx` shows `OnboardingPage` if `!org.currentOrg`.
**Admin guard:** `app/app/admin/layout.jsx` checks `auth.profile?.role === "superadmin"` client-side.

**Data hooks pattern:** Each hook returns `{ items, loading, create, update, remove, reload }`. All import `supabase` from `../utils/supabase`. Org change re-triggers `useEffect` via `orgId`.

---

## Key RPCs

| Function | Purpose |
|----------|---------|
| `get_hotel_with_providers` | Public: hotel + nearby providers + bikes for guest page |
| `create_guest_booking` | Public: creates booking with commission calc |
| `get_booking_by_token` | Public: looks up booking by cancellation token |
| `cancel_booking_by_token` | Public: cancels + determines free vs partial refund |
| `get_hotel_analytics` | Admin: aggregated hotel analytics |
| `track_analytics_event` | Public: inserts analytics event (qr_scan, page_view, etc.) |
| `is_platform_admin()` | Helper: checks superadmin role |

---

## Architecture Gotchas

- `daysDiff(a, b)` in `formatters.js` returns **inclusive** count (has `+1` built in) — do NOT add another `+1`
- `navigationItems.js` is the single source of truth for sidebar links/paths
- All `src/` components are Client Components (`"use client"`)
- Auth: `signIn`/`signUp` **throw** on error (no `{ error }` return) — use try/catch
- Guest booking flow is fully unauthenticated — uses RPC with `anon` key
- Viewer role: `get_user_write_org_ids()` returns only orgs where user ≠ viewer — all write policies use this
- Booking widget uses separate `public_api_key`, isolated from Auth
- RLS: all tables scoped to `organization_id`. Lociva tables use `is_platform_admin()` for writes.
- Current org persisted in `localStorage` as `currentOrgId`

---

## Branding

- **Primary:** Waldgrün `#1A7D5A` · Light `#3BAA82` · Tint `#D4EDE2` · Dark `#1E2D26`
- **Logo:** LOCIVA uppercase, font-weight 300, letter-spacing 6-8px
- **Tagline (EN):** "Local experiences, one scan away." · **(DE):** "Lokale Erlebnisse. Einfach. Hier."
- **Brand guide:** `branding/lociva-brand-guide.md`
- **SVG assets:** `branding/lociva-logo-primary.svg`, `lociva-logo-dark.svg`, `lociva-logo-wordmark.svg`, `lociva-icon.svg`

---

## Deployment & Build

Deploy: `vercel --prod`

**Critical constraints:**
- `app/layout.jsx` must keep `export const dynamic = "force-dynamic"` — prevents static generation of `/_not-found` (breaks Supabase SSR cookies)
- `src/utils/supabase.js` uses `|| "placeholder"` fallbacks — `createBrowserClient` throws if URL/Key are empty even at build time
- If Vercel builds finish in ~126ms without running `next build`, `outputDirectory` is set to `""` — fix: set to `null`

**ESLint:**
- `react-refresh/only-export-components` disabled for `app/**` (Next.js named exports like `metadata`)
- `globals.node` included for `process.env.*`

**Env vars:**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```
Brevo keys are Supabase Edge Function Secrets: `BREVO_API_KEY`, `FROM_EMAIL`, `FROM_NAME`

**Fresh DB setup order:**
1. `supabase-schema.sql`
2. `supabase-public-booking.sql`
3. `supabase/migrations/001_lociva_extension.sql`
4. `supabase/migrations/002_cancellation_token.sql`
5. (optional) `supabase/seed-testdata.sql`

---

## Dev Commands

```bash
npm run dev    # localhost:3000
npm run build  # ESLint + type check + production build
npm run lint   # ESLint only
npm test       # formatters, calculatePrice, exportCSV tests (node --test)
```
