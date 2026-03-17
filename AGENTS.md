# AGENTS.md

This file provides guidance to AI coding agents (Codex, Copilot, etc.) when working with code in this repository.

## What is this project?

**Lociva** is a local activities marketplace for hotel guests, built on top of **RentCore** (B2B SaaS for rental operators). Hotel guests scan a QR code, browse nearby providers (bike shops, activity operators), and book + pay online via Stripe Connect. Providers manage their inventory through the RentCore dashboard.

## Commands

```bash
npm run dev       # Start dev server at localhost:3000
npm run build     # Production build (runs ESLint + type check first)
npm run lint      # ESLint only
npm run start     # Start production server (after build)
npm test          # Runs unit tests (node --test)
```

## Architecture

### Stack
- **Next.js 15** App Router — `app/` directory for routing
- **React 18** — all `src/` components are Client Components (`"use client"`)
- **Supabase** — PostgreSQL + Auth + RLS + Edge Functions (no API routes needed for CRUD)
- **Stripe Connect** — Express accounts for providers, Checkout for guests
- **Tailwind CSS v3** — Lociva brand palette (Waldgrün `#1A7D5A`)
- **@supabase/ssr** for cookie-based auth in middleware
- **@dnd-kit** for Gantt drag-and-drop in CalendarPage
- **jsPDF + jspdf-autotable** for PDF invoice/contract generation
- **Recharts** for dashboard charts
- **qrcode** for hotel QR code generation
- **Brevo** for transactional email (via Supabase Edge Function)
- **Custom I18nProvider** for DE/EN internationalization

### Directory Structure

```
app/                        # Next.js App Router
├── layout.jsx              # Root: AuthProvider + I18nProvider + CookieBanner
├── page.jsx                # Landing page (redirects to /app if logged in)
├── login/ signup/          # Auth pages
├── impressum/ datenschutz/ agb/  # Legal pages
├── hotel/[slug]/           # Public guest booking flow (unauthenticated)
│   ├── page.jsx            # HotelLandingPage
│   └── cancel/page.jsx     # GuestCancelPage (self-service cancellation)
├── api/
│   ├── booking/public/     # Guest booking lookup + cancellation
│   └── stripe/             # checkout, cancel, connect, webhook routes
└── app/                    # Protected area — all routes at /app/*
    ├── layout.jsx          # OrgProvider > AppProvider > DataProvider > AppShell
    ├── page.jsx            # DashboardPage
    ├── [feature]/page.jsx  # Re-exports from src/views/
    └── admin/              # Platform admin only (hotels, providers, regions, analytics)

src/
├── views/                  # Page components (named "views" to avoid Next.js conflict)
├── components/             # UI components, all "use client"
├── context/                # React contexts (AuthContext, OrgContext, AppContext, DataContext)
├── hooks/                  # Data hooks (useBookings, useBikes, useCustomers, etc.)
└── utils/
    ├── supabase.js         # Browser client (singleton, used by all hooks)
    ├── supabase/server.js  # Server client (used only in middleware.ts)
    ├── i18n/               # DE/EN translations + I18nProvider
    ├── formatters.js       # Date/currency helpers
    ├── navigationItems.js  # Sidebar nav config (single source of truth)
    └── calculatePrice.js   # Price calculation engine

supabase/
├── migrations/             # Canonical migrations (001_lociva_extension, 002_cancellation_token)
├── functions/              # Edge Functions (send-email, stripe-*, delete-account)
└── *.sql                   # Legacy migration scripts

middleware.ts               # Auth guard: /app/* requires session; /login /signup redirect if logged in
```

### Context / Data Flow

Provider hierarchy (only inside `/app/*`):

```
AuthProvider (app/layout.jsx — root)
  └── OrgProvider          (app/app/layout.jsx)
       └── AppProvider     (dark mode, sidebar state, search query)
            └── DataProvider  (loads all org data: bikes, bookings, customers, invoices, etc.)
```

- `useAuth()` — session, user, profile (incl. `role`), signIn/signOut/signUp
- `useOrganization()` — organizations[], currentOrg, switchOrg, createOrganization
- `useApp()` — darkMode, sidebarOpen, searchQuery
- `useData()` — bikes, bookings, customers, invoices, categories, addons, maintenance, vouchers, notifications

**Org guard**: `app/app/layout.jsx` shows `OnboardingPage` if `!org.currentOrg`.
**Admin guard**: `app/app/admin/layout.jsx` checks `auth.profile?.role === "platform_admin"`.

### Supabase Data Hooks Pattern

Each hook (e.g. `useBookings.js`) follows the same shape:
```js
const [items, setItems] = useState([]);
// load() fetches all items for the current orgId
// Returns: { items, loading, create, update, remove, reload }
```
All hooks import `supabase` from `../utils/supabase` (browser singleton). Changing the org re-triggers `useEffect` via `orgId`.

### Key RPCs

| Function | Purpose |
|----------|---------|
| `get_hotel_with_providers` | Public: hotel + providers + bikes for guest page |
| `create_guest_booking` | Public: booking with commission calculation |
| `get_booking_by_token` | Public: lookup booking by cancellation token |
| `cancel_booking_by_token` | Public: cancel with free/partial determination |
| `is_platform_admin()` | Helper: checks platform_admin role |

### Critical Rules

- `daysDiff(a, b)` in `formatters.js` returns **inclusive** count (+1 built in) — do NOT add another +1
- `navigationItems.js` is the single source of truth for sidebar links and URL paths
- Auth: `signIn`/`signUp` throw on error — callers must use try/catch, not `{ error }` destructuring
- Booking widget is isolated from Auth, uses separate `public_api_key`
- Viewer role: `get_user_write_org_ids()` returns only org IDs where user ≠ viewer
- Guest booking flow is fully unauthenticated — uses RPC calls with `anon` key

### Multi-Tenancy / RLS

All Supabase tables have Row Level Security. Provider data is scoped to `organization_id`. Lociva platform tables (`hotels`, `regions`, etc.) use `is_platform_admin()` for write access. Current org persisted in `localStorage` as `currentOrgId`.

### Deployment

Deploy with `vercel --prod`. Critical constraints:

- `app/layout.jsx` must have `export const dynamic = "force-dynamic"` — prevents static generation of `/_not-found` which breaks Supabase SSR cookie reading
- `src/utils/supabase.js` needs `|| "placeholder"` fallbacks — `createBrowserClient` throws if URL/Key are empty (even during build)
- `outputDirectory` in Vercel must be `null` (not empty string) — otherwise Vercel skips the build

### Database Setup

Run in order in Supabase SQL Editor:
1. `supabase-schema.sql` — core RentCore tables + RLS
2. `supabase-public-booking.sql` — booking widget API extension
3. `supabase/migrations/001_lociva_extension.sql` — Lociva tables, RPCs, RLS
4. `supabase/migrations/002_cancellation_token.sql` — cancellation token + RPCs

Environment variables:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```
