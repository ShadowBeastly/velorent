# CLAUDE.md — Lociva Platform Context

## Product Architecture (March 2026)

**funk-e.solutions** is the umbrella brand and operating entity (Gewerbe, Christopher Funke). It contains three products:

| Product | What it is | Domain | Status |
|---------|-----------|--------|--------|
| **funk-e.solutions** | Consulting: process architecture for SMEs (Handwerk/KMU) | funk-e.solutions | Live |
| **RentCore** | B2B SaaS: booking software for rental activity operators (bikes, canoes, ski, etc.) | rentcore.de | Live |
| **Lociva** | Marketplace: hotel guests book local activities via QR code | lociva.de | Building (MVP nearly complete) |

**Relationship:** RentCore is the operating system for providers. Lociva is the hotel distribution channel on top. Providers use RentCore to manage their business — Lociva brings them hotel guests as an additional booking source. Phase 1: always sold as bundle. Phase 2+: separate products, standalone RentCore subscriptions.

**RentCore expansion (end of 2026):** Winter sports categories (ski, snowboard, snowshoes, cross-country ski) — year-round usage — opens Alpine hotel market for Lociva.

## Project Overview

**Lociva** (lociva.de) is a local activities marketplace for hotel guests. Hotels get a free digital concierge (QR code in rooms), guests scan and book local activities, providers get paid automatically via Stripe Connect. Lociva earns 5-15% commission per booking.

**Domain:** lociva.de
**Founder:** Christopher Funke, funk-e.solutions
**Codebase:** Extended from the RentCore (formerly VeloRent) codebase — all marketplace features are integrated into the same monorepo.

---

## Business Model

### Three-Sided Marketplace

1. **Hotels** — Get the platform for free. Place QR codes in rooms/reception. Optionally earn 1-2% commission (to be tested after pilot).
2. **Guests** — Scan QR code, see local activities, book and pay online. No login required. Pay normal market price.
3. **Providers** (bike shops, activity operators) — List their offerings, manage availability, receive automatic payouts minus commission.

### Commission Structure

| Category | Commission | Avg Booking Value | Lociva Earns |
|----------|-----------|-------------------|-------------|
| Bikes / E-Bikes | 5% | 20-50 €/day | 1-2.50 € |
| Canoe / SUP | 10% | 40 € | 4.00 € |
| Go-Kart | 10% | 35 € | 3.50 € |
| Climbing Park | 10% | 30 € | 3.00 € |
| Guided Tours (bike, city, wine) | 12% | 65 € | 7.80 € |
| Escape Room | 10% | 25 € p.P. | 2.50 € |
| Wine Tasting / Culinary | 12% | 45 € | 5.40 € |
| Wellness / Spa | 12% | 55 € | 6.60 € |
| Premium (hot air balloon, sailing) | 15% | 150 € | 22.50 € |

### Payment Flow (Stripe Connect)

1. Guest pays full price online via Stripe Checkout
2. Stripe Connect splits automatically: Provider gets their share, Lociva gets commission
3. Provider never sees guest payment data directly
4. This prevents disintermediation (providers can't bypass the platform)

### Cancellation Policy

| Timing | Refund | Commission |
|--------|--------|-----------|
| > 24h before start | 100% refund | No commission |
| < 24h before start | 50% fee | 5% on retained amount |
| No-show | 100% charged | 5% on full amount |

---

## Target Market

- **Region:** DACH (Germany, Austria, Switzerland), starting with Rhein-Main
- **Hotels:** Classic hotels only for Phase 1 (no vacation rentals, hostels, campsites)
- **Providers:** Bike rental shops and e-bike operators for Phase 1, expanding to all local activities
- **Guests:** Hotel guests (most affluent and activity-hungry tourist segment)

### Pilot Region: Rhein-Main (Summer 2026)

Three identified clusters:
1. **Frankfurt-Sachsenhausen:** Flemings Hotel, Kennedy 89 (Hyatt), Cult Hotel, STAYERY + 4 e-bike rentals within 2km
2. **Bad Homburg / Taunus:** Steigenberger, Maritim, Parkhotel + Schlosshotel Kronberg
3. **Rheingau (Eltville/Rüdesheim):** Kronenschlösschen, Weinhotel Offenstein + Rheingau Riesling Rad, Rheingau-eRad

---

## Technical Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 18, Tailwind CSS v3 |
| Backend/DB | Supabase (PostgreSQL + Auth + RLS + Edge Functions) |
| Payments | Stripe Connect (Express accounts) |
| QR Codes | qrcode (npm) |
| PDF | jsPDF + jspdf-autotable |
| Charts | Recharts |
| Drag & Drop | @dnd-kit |
| Email | Brevo Transactional API (via Supabase Edge Function) |
| i18n | Custom I18nProvider (DE / EN) |
| Deployment | Vercel |

### Four User Types / Views

1. **Hotel Guest (unauthenticated)** — QR code → `/hotel/[slug]` → browse providers → book → pay via Stripe Checkout → confirmation email with cancellation link
2. **Provider (bike shop / activity operator)** — Login → Provider Dashboard → Stripe Connect onboarding → manage fleet, bookings, payouts
3. **Hotel** — Login → Hotel Stats page (read-only booking stats, QR code download)
4. **Platform Admin** — Login → Admin Panel (hotels, providers, regions, analytics)

### Directory Structure

```
app/                        # Next.js App Router
├── layout.jsx              # Root: AuthProvider + I18nProvider + CookieBanner
├── page.jsx                # Landing page (redirects to /app if logged in)
├── login/ signup/          # Auth pages
├── impressum/ datenschutz/ agb/  # Legal pages
├── hotel/
│   └── [slug]/
│       ├── page.jsx        # HotelLandingPage (public guest booking flow)
│       └── cancel/page.jsx # GuestCancelPage (guest self-service cancellation)
├── api/
│   ├── booking/public/route.js   # GET (lookup by token) + POST (cancel + refund)
│   └── stripe/
│       ├── checkout/route.ts     # → stripe-checkout Edge Function
│       ├── cancel/route.ts       # → stripe-cancel Edge Function
│       ├── connect/route.ts      # → stripe-connect Edge Function
│       └── webhook/route.js      # Stripe webhook handler
└── app/                    # Protected area — all routes at /app/*
    ├── layout.jsx          # OrgProvider > AppProvider > DataProvider > AppShell
    ├── page.jsx            # DashboardPage
    ├── bookings/ calendar/ categories/ customers/ fleet/ invoices/
    ├── addons/ maintenance/ pricing/ vouchers/ settings/
    ├── marketplace/        # Provider Stripe Connect + AGB + hotel bookings
    ├── hotel-stats/        # Hotel read-only dashboard
    └── admin/
        ├── layout.jsx      # Admin guard (role === "superadmin")
        ├── hotels/ providers/ regions/ analytics/

src/
├── views/                  # Page components (named "views" to avoid Next.js Pages Router conflict)
├── components/             # UI components, all "use client"
├── context/                # React contexts (AuthContext, OrgContext, AppContext, DataContext)
├── hooks/                  # Data hooks (useBookings, useBikes, useCustomers, etc.)
└── utils/
    ├── supabase.js         # Browser client (singleton, used by all hooks)
    ├── supabase/server.js  # Server client (used only in middleware.ts)
    ├── i18n/               # DE/EN translations + I18nProvider
    ├── formatters.js       # Date/currency helpers
    ├── calculatePrice.js   # Price calculation engine
    ├── navigationItems.js  # Sidebar nav config (single source of truth)
    └── ...

supabase/
├── migrations/
│   ├── 001_lociva_extension.sql  # Lociva tables + RPCs + RLS
│   └── 002_cancellation_token.sql # Cancellation token + RPCs
├── functions/
│   ├── send-email/         # Brevo transactional email (booking confirmation)
│   ├── stripe-checkout/    # Stripe Checkout session creation
│   ├── stripe-webhook/     # Stripe event handling
│   ├── stripe-cancel/      # Stripe refunds (full/partial)
│   ├── stripe-connect/     # Stripe Express account creation
│   └── delete-account/     # User account deletion
├── seed-testdata.sql       # Test data for development
└── *.sql                   # Legacy migration scripts (pre-migration system)

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

**Org guard**: `app/app/layout.jsx` shows `OnboardingPage` if `!org.currentOrg`. Middleware handles unauthenticated redirects.

**Admin guard**: `app/app/admin/layout.jsx` checks `auth.profile?.role === "superadmin"` client-side.

### Supabase Data Hooks Pattern

Each hook (e.g. `useBookings.js`) follows the same shape:
```js
const [items, setItems] = useState([]);
// load() fetches all items for the current orgId
// Returns: { items, loading, create, update, remove, reload }
```
All hooks import `supabase` from `../utils/supabase` (browser singleton). Changing the org re-triggers `useEffect` via `orgId`.

### Stripe Connect Architecture

- **Platform account:** Lociva's Stripe account
- **Connected accounts:** Each provider has Stripe Express account (onboarded via MarketplacePage)
- **Booking flow:** Guest → Stripe Checkout with `application_fee_amount` → automatic split → provider payout
- **Commission:** Hardcoded in `create_guest_booking` RPC (5% bikes, 10-12% experiences, 15% premium)
- **Cancellation:** Full refund >24h, 50% <24h, 0% no-show — handled by `cancel_booking_by_token` RPC + `stripe-cancel` Edge Function
- **Guest self-service:** Email contains cancellation link with UUID token → `/hotel/[slug]/cancel?token=UUID`

### Key RPCs (Supabase Functions)

| Function | Purpose |
|----------|---------|
| `get_hotel_with_providers` | Public: loads hotel + nearby providers + their bikes for guest landing page |
| `create_guest_booking` | Public: creates booking with commission calculation, returns booking ID |
| `get_booking_by_token` | Public: looks up booking by cancellation token |
| `cancel_booking_by_token` | Public: cancels booking, determines free vs partial based on 24h threshold |
| `get_hotel_analytics` | Admin: aggregated analytics for a hotel |
| `track_analytics_event` | Public: inserts analytics event (qr_scan, page_view, etc.) |
| `is_platform_admin()` | Helper: checks if current user has `superadmin` role |

### Architecture Gotchas

- `daysDiff(a, b)` in `src/utils/formatters.js` returns an **inclusive** day count (already has `+1` built in) — do NOT add another `+1` at call sites
- `src/utils/navigationItems.js` is the single source of truth for sidebar links and URL paths
- All `src/` components are Client Components (`"use client"`)
- Auth: `signIn`/`signUp` throw on error (don't return `{ error }`) — callers must use try/catch
- Booking widget is isolated from Auth, uses separate API key (`public_api_key`)
- Viewer role: `get_user_write_org_ids()` returns only org IDs where user ≠ viewer — all write policies use this function
- Guest booking flow is fully unauthenticated — uses RPC calls with `anon` key, not user session

### Multi-Tenancy / RLS

All Supabase tables have Row Level Security. Data is scoped to `organization_id`. The `organization_members` table links users to organizations with roles (`owner`, `admin`, `member`, `viewer`). Current org persisted in `localStorage` as `currentOrgId`.

Lociva-specific tables (`hotels`, `regions`, `hotel_providers`, `analytics_events`) use `is_platform_admin()` for write access and public/authenticated read access as appropriate.

### Branding

- **Primary color:** Waldgrün `#1A7D5A`
- **Logo:** LOCIVA uppercase, font-weight 300, letter-spacing 6-8px
- **Tagline:** "Local experiences, one scan away." (EN) / "Lokale Erlebnisse. Einfach. Hier." (DE)
- **Full brand guide:** `branding/lociva-brand-guide.md`
- **SVG assets:** `branding/lociva-logo-primary.svg`, `lociva-logo-dark.svg`, `lociva-logo-wordmark.svg`, `lociva-icon.svg`

### ESLint Notes

- `react-refresh/only-export-components` is disabled for `app/**` (Next.js uses named exports like `metadata` alongside default component exports)
- `globals.node` is included so `process.env.*` is recognized without lint errors

### Deployment

Deploy with `vercel --prod`. Critical production constraints:

- `app/layout.jsx` must export `export const dynamic = "force-dynamic"` — do NOT remove. Prevents static generation of `/_not-found` which breaks Supabase SSR cookie reading.
- `src/utils/supabase.js` uses `|| "placeholder"` fallbacks — `createBrowserClient` throws synchronously if URL/Key are empty (even during build).
- If Vercel builds succeed in ~126ms without running `next build`, check `outputDirectory` setting — empty string causes Vercel to skip the build entirely. Fix: set `outputDirectory` to `null`.

### Database Setup

For a fresh environment, run migrations in order:
1. `supabase-schema.sql` — core RentCore tables + RLS
2. `supabase-public-booking.sql` — booking widget API extension
3. `supabase/migrations/001_lociva_extension.sql` — Lociva tables, RPCs, RLS
4. `supabase/migrations/002_cancellation_token.sql` — cancellation token + RPCs
5. (Optional) `supabase/seed-testdata.sql` — test data for development

Environment variables required:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Brevo email keys are set as Supabase Edge Function Secrets (not as Next.js env vars):
- `BREVO_API_KEY`, `FROM_EMAIL`, `FROM_NAME`

---

## Dev Commands

```bash
npm run dev       # Start dev server at localhost:3000
npm run build     # Production build (runs ESLint + type check first)
npm run lint      # ESLint only
npm run start     # Start production server (after build)
npm test          # Runs formatters, calculatePrice, exportCSV tests (node --test)
```

---

## Build Status (March 2026)

### Completed

- [x] Lociva database schema (regions, hotels, hotel_providers, hotel_users, analytics_events)
- [x] RLS policies for all Lociva tables
- [x] Stripe Connect setup (platform account, Express onboarding flow)
- [x] Provider Stripe Express onboarding UI (MarketplacePage)
- [x] Provider AGB acceptance flow
- [x] Guest booking flow (`/hotel/[slug]` — 3-step: browse → dates → contact → pay)
- [x] Stripe Checkout with application_fee (commission split)
- [x] Booking confirmation email (DE/EN, via Brevo Edge Function)
- [x] Guest self-service cancellation (token-based, tiered refund)
- [x] Hotel dashboard (HotelStatsPage, read-only)
- [x] Admin Panel: Hotels, Providers, Regions, Analytics
- [x] QR code generator in Admin
- [x] Hotel-Provider mapping in Admin
- [x] i18n (DE/EN) across all views
- [x] Lociva brand guide applied to guest-facing surfaces
- [x] Cancellation policy visualizer
- [x] CI pipeline (GitHub Actions: lint + build + test)

### Remaining for Pilot Launch

- [ ] Production Stripe Connect account activation
- [ ] Real hotel + provider onboarding (Rhein-Main pilot)
- [ ] End-to-end payment testing with live Stripe keys
- [ ] AGB legal review (~200-400 €)
- [ ] QR code print materials (DIN A6 cards for hotels)
- [ ] Post-booking guest satisfaction survey
- [ ] Analytics dashboard refinement (conversion funnel)

### Explicitly NOT in MVP

- Mobile app (React Native) — after web validation
- Booking.com / Channel Manager integration — too complex
- Automatic radius calculation (PostGIS) — manual hotel-provider mapping
- Hotel WiFi portal integration — requires per-hotel IT coordination
- Extended categories beyond bikes — after bike validation
- Automated scout billing — manual Excel/Notion in year 1
- i18n beyond DE/EN — only when expanding beyond DACH

---

## Legal Framework

- **Lociva's role:** Vermittler (intermediary), NOT Vermieter (lessor) or Veranstalter (organizer)
- **Rental contract:** Between guest and provider, not involving Lociva
- **Hotel liability:** None. Hotel merely recommends a service
- **Provider requirement:** Must have Betriebshaftpflichtversicherung (business liability insurance)
- **AGB:** Two sets: Guest AGB + Provider AGB (in `docs/rechtliches/`)

---

## Key Metrics to Track

| KPI | Target | Method |
|-----|--------|--------|
| QR scans per hotel/month | > 100 | Analytics tracking |
| Scan-to-booking conversion | > 10% | Funnel analysis |
| Bookings per hotel/month | > 30 | Booking database |
| Cancellation rate | < 15% | Stripe data |
| Guest NPS | > 40 | Post-booking survey |

---

## Sales Approach

### Tandem Model
1. Secure bike shop first (supply)
2. Go to hotel with concrete offering (demand)
3. Never approach hotel without having providers ready

### Sales Scripts
- Provider pitch: `docs/vertrieb/fahrradladen-skript.md`
- Hotel pitch: `docs/vertrieb/hotel-skript.md`
- Follow-up email template: `docs/vertrieb/Email-Niederrad-Erstinfo.md`

### Scout Model (Phase 2+)
- Scouts get exclusive region + playbook + platform access
- Revenue share: 20-30% of Lociva's commission
- Playbook: `docs/Lociva-Scout-Playbook.docx`
