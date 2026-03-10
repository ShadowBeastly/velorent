# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at localhost:3000
npm run build     # Production build (runs ESLint + type check first)
npm run lint      # ESLint only
npm run start     # Start production server (after build)
```

No test runner is configured. There are no unit/integration tests.

## Architecture

**VeloRent Pro** is a multi-tenant SaaS for bike rental businesses (hotels, rental shops). Each tenant is an "organization" with isolated data via Supabase Row Level Security.

### Stack
- **Next.js 15** App Router — `app/` directory for routing
- **React 18** — all components are Client Components (`"use client"`)
- **Supabase** — PostgreSQL + Auth + RLS (no API routes needed for CRUD)
- **Tailwind CSS v3** with custom `brand-*` color scale (indigo) and `slate-850` custom shade
- **@supabase/ssr** for cookie-based auth in middleware
- **dnd-kit** for Gantt drag-and-drop in CalendarPage
- **jspdf + jspdf-autotable** for PDF invoice generation
- **recharts** for revenue charts

### Directory Structure

```
app/                        # Next.js App Router
├── layout.jsx              # Root layout — only wraps AuthProvider
├── page.jsx                # Landing page (redirects to /app if logged in)
├── login/ signup/          # Auth pages
├── impressum/ datenschutz/ agb/  # Legal pages
└── app/                    # Protected area — all routes at /app/*
    ├── layout.jsx          # Protected layout: OrgProvider > AppProvider > DataProvider > Sidebar + Header
    └── [feature]/page.jsx  # Re-exports from src/views/

src/
├── views/                  # Page components (NOTE: named "views" not "pages" to avoid Next.js Pages Router conflict)
├── components/             # UI components, all "use client"
├── context/                # React contexts (AppContext, AuthContext, OrgContext, DataContext)
├── hooks/                  # Data hooks (useBookings, useBikes, useCustomers, etc.)
└── utils/
    ├── supabase.js         # Browser client (singleton, used by all hooks)
    ├── supabase/server.js  # Server client (used only in middleware.ts)
    ├── formatters.js       # Date/currency helpers
    └── navigationItems.js  # Sidebar nav config

middleware.ts               # Auth guard: /app/* requires session; /login /signup redirect if logged in
```

### Context / Data Flow

The provider hierarchy (only inside `/app/*`):

```
AuthProvider (app/layout.jsx — root)
  └── OrgProvider          (app/app/layout.jsx)
       └── AppProvider     (dark mode, sidebar state, search query)
            └── DataProvider  (loads all org data: bikes, bookings, customers, invoices, etc.)
```

- `useAuth()` — session, user, profile, signIn/signOut/signUp
- `useOrganization()` — organizations[], currentOrg, switchOrg, createOrganization
- `useApp()` — darkMode, sidebarOpen, searchQuery
- `useData()` — bikes, bookings, customers, invoices, categories, addons, maintenance, vouchers, notifications

**Org guard**: `app/app/layout.jsx` shows `OnboardingPage` if `!org.currentOrg` (user has no organization yet). The middleware handles unauthenticated redirects.

### Supabase Data Hooks Pattern

Each hook (e.g. `useBookings.js`) follows the same shape:
```js
const [items, setItems] = useState([]);
// load() fetches all items for the current orgId
// Returns: { items, loading, create, update, remove, reload }
```
All hooks import `supabase` from `../utils/supabase` (browser singleton). Changing the org re-triggers `useEffect` via `orgId`.

### Key Utilities

`daysDiff(a, b)` in `src/utils/formatters.js` returns an **inclusive** day count (already has `+1` built in). Do NOT add another `+1` at call sites — this was a previous bug.

`src/utils/navigationItems.js` is the single source of truth for sidebar links and URL paths.

### Multi-Tenancy / RLS

All Supabase tables have Row Level Security. Data is scoped to `organization_id`. The `organization_members` table links users to organizations with roles (`owner`, `admin`, `member`, `viewer`). The current org is persisted in `localStorage` as `currentOrgId`.

### Auth Architecture

- Auth state lives in `useProvideAuth` (hook) → `AuthContext` → available everywhere via `useAuth()`
- After login, the Supabase session cookie is set; middleware reads it server-side
- `signIn`/`signUp` throw on error (don't return `{ error }`) — callers must use try/catch

### ESLint Notes

- `react-refresh/only-export-components` is disabled for `app/**` (Next.js uses named exports like `metadata` alongside default component exports)
- `globals.node` is included so `process.env.*` is recognized without lint errors

### Deployment

Deploy with `vercel --prod`. A few critical production constraints:

- `app/layout.jsx` exports `export const dynamic = "force-dynamic"` — do NOT remove it. It prevents static generation of `/_not-found`, which breaks Supabase SSR cookie reading.
- `src/utils/supabase.js` uses `|| "placeholder"` fallbacks for the URL/key — `createBrowserClient` throws synchronously if either value is falsy (even during build).
- If Vercel builds succeed in ~126ms without running `next build`, check the project's `outputDirectory` setting — an empty string causes Vercel to skip the build entirely. Fix via Vercel dashboard or API: set `outputDirectory` to `null`.

### Database Setup

Run in order in Supabase SQL Editor:
1. `supabase-schema.sql` — core tables + RLS
2. `supabase-public-booking.sql` — booking widget API extension

Environment variables required:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
