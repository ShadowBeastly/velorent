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

---

## RentCore Feature Expansion (Build Agent Instructions)

> This section defines the RentCore feature roadmap derived from competitive analysis against Booqable, Rentware, bike.rent Manager, and Twice Commerce. These features are built into the existing monorepo, extending the provider dashboard (`/app/*`).

### Build Rules (additions to existing architecture rules)

- All new tables get `organization_id` column + RLS policies matching existing patterns.
- New features extend existing hooks pattern (`useDeposits.js`, `useMaintenance.js`, etc.).
- New API routes go under `app/api/` following existing patterns (not under `app/app/api/`).
- Stripe integration extends the existing Stripe Connect setup (same platform account, same connected accounts).
- Email: migrate from Brevo to Resend (`npm install resend @react-email/components`) for new templates. Existing Brevo Edge Functions stay until full migration.
- New dependencies allowed: `signature_pad`, `resend`, `@react-email/components`, `qrcode`.
- `calculatePrice.js` gets replaced by the new Pricing Engine. Migrate existing logic, don't keep both.
- All new UI goes into `src/views/` (page components) and `src/components/` (shared components), matching existing patterns.
- German UI labels first, wrap in `t()` for i18n.

### Existing RentCore Features (already built)

PDF contract generation, conflict detection (double-booking prevention), CSV/JSON export/import, discount logic (from day 7 at 25€/day), basic handover protocol (text-based, no photos), fleet management (bikes CRUD + status), booking management (create, edit, cancel), categories, addons, pricing rules (basic), vouchers (basic), maintenance (basic), invoices, customer database, calendar view.

### Build Sequence

Work sequentially. Each milestone: schema change → migration → RPC/API → hook → UI → test.

#### M1: Buffer time between rentals
Add `buffer_minutes INTEGER DEFAULT 120` to bikes table. Extend conflict detection: booking end + buffer_minutes = earliest next start. E-Bikes default 180 min. Settings page: global default buffer (slider, 30 min steps, 0-360). Bike detail: individual override. Calendar view: show buffer as hatched block.

#### M2: Pricing Engine (replaces calculatePrice.js)
New tables: `pricing_rules` (name, type, adjustment_type, adjustment_value, priority, applies_to) + `pricing_rule_conditions` (date_range, weekdays, time_range, min_duration, min_quantity). New function: `calculatePrice(bikeId, startDate, endDate, quantity)` loads base price + all active rules sorted by priority, applies matching rules cumulatively per day. Returns `{ basePricePerDay, adjustments: [{rule, amount}], totalPrice, savings }`. Migrate existing discount logic as a pricing_rule. Seed data: Hauptsaison +25% (Jun-Aug), Nebensaison -15% (Nov-Feb), Wochenende +15% (Sa/So), Wochenmiet -20% (7+ days), Gruppenrabatt -10% (5+ bikes). CRUD UI at Settings → Preisregeln. Checkout shows price breakdown.

#### M3: Deposit management
New table: `deposits` (booking_id, amount, status [pending/held/partially_charged/fully_charged/released], stripe_payment_intent_id, charged_amount, charge_reason). Add to bikes: `deposit_amount DECIMAL`, `deposit_type ENUM(fixed/percentage)`, `deposit_percentage DECIMAL`. Auto-calculate at booking. Return flow: "Release deposit" or "Charge deposit" with amount + reason. Stripe Pre-Auth (capture_method=manual) using existing Stripe Connect.

#### M4: Digital signature
`npm install signature_pad`. Client component `SignaturePad.tsx` (touch canvas, min 300x150px, outputs base64 PNG). Save to Supabase Storage. Embed in existing PDF contract (signature field bottom + timestamp + checkbox text). Add to bookings: `signature_url`, `signed_at`, `signed_contract_url`.

#### M5: Email system with QR codes
`npm install resend @react-email/components qrcode`. Add to bookings: `confirmation_code VARCHAR(8) UNIQUE`, `qr_code_url`, `email_sent_at`. New table: `email_log`. QR contains `https://[app-url]/checkin/{confirmation_code}`. 4 React Email templates: booking-confirmation (with QR + bike details + price + location), pickup-reminder (24h before), return-reminder (24h before), receipt (after return with deposit status). Vercel Cron: daily 10:00 send reminders. Route `/checkin/[code]` loads booking via QR scan, starts handover flow.

#### M6: Coupon system
New tables: `coupons` (code, type [percentage/fixed], value, min_order_value, min_duration_days, min_quantity, max_uses, used_count, valid_from, valid_until, applies_to, is_active) + `coupon_usages`. Validation: active + in date range + not exhausted + conditions met. One code per booking. Checkout: code input with live validation. Applied after pricing rules. Settings → Gutscheine: CRUD + batch generation ("Generate 10 codes at 15%").

#### M7: Availability calendar (enhanced)
Extend existing calendar view. Three modes: day (timeline 06-22h, bikes as rows, bookings as blocks), week (7 columns, bookings as bars), month (utilization % per day as color). Color codes: blue=confirmed+paid, yellow=reserved, green=currently rented, red=overdue, gray-hatched=buffer, orange=maintenance. Click empty slot → quick booking modal (bike + slot prefilled). Click block → booking detail sidebar. Filter by category, status.

#### M8: Maintenance tracker (enhanced)
New tables: `maintenance_schedules` (bike_id, type [routine/brake/tire/chain/battery/full_service], interval_days, interval_rentals, next_due_at, is_overdue GENERATED), `maintenance_logs` (bike_id, schedule_id, type, description, performed_by, cost, parts_used TEXT[], photos TEXT[]), `bike_health` (bike_id UNIQUE, total_rentals, total_rental_days, brake_status, tire_front_status, tire_rear_status, chain_status, battery_health_percent, last_full_service). Return checklist (mandatory before completing return): brakes, tires, chain, lights, frame, bell, saddle, accessories, battery %. After each return: update total_rentals + check intervals → set next_due_at. If overdue → bike not bookable. Dashboard widget: "Maintenance due" (overdue=red, soon=yellow). Bike detail: maintenance tab with service history + health status.

#### M9: Kiosk mode
Route `/kiosk` (or `/app/kiosk`). Fullscreen layout, no sidebar, large touch buttons (min 48px), font min 18px. Flow: welcome screen → bike selection (large cards with photos) → date picker → customer data form → summary → payment (Stripe or "pay at counter") → signature → QR confirmation. Auto-reset to welcome after 60s inactivity. Admin access: tap logo 3x → PIN entry. Add to organizations: `kiosk_enabled BOOLEAN`, `kiosk_pin VARCHAR(6)`.

#### M10: Photo damage documentation (CORE DIFFERENTIATOR)
New tables: `handover_protocols` (booking_id, type [pickup/return], performed_by, bike_condition_notes, checklist JSONB), `condition_photos` (protocol_id, photo_url, thumbnail_url, position [front/rear/left_side/right_side/top/detail], annotations JSONB [{x, y, radius, label, severity}]), `damage_reports` (booking_id, pickup_protocol_id, return_protocol_id, damages JSONB [{description, severity, photo_id, estimated_cost}], total_estimated_cost, deposit_charged, status [detected/customer_notified/resolved/disputed]).

Components:
- `CameraCapture.tsx`: device camera via MediaDevices API, auto-compress (max 1200px, JPEG 80%)
- `PhotoAnnotator.tsx`: canvas overlay on photo, touch to mark damage (red circle + label)
- `SideBySideCompare.tsx`: pickup photo left, return photo right (same position)
- `ConditionChecklist.tsx`: touch-optimized checklist (frame, wheels, brakes, chain, gears, lights, bell, saddle, accessories, battery)
- `HandoverFlow.tsx`: stepper (photos → checklist → signature → done)
- `DamageReportGenerator.tsx`: PDF with before/after photos + annotations + costs

Pickup flow: 6 photo positions → optional damage marking → checklist → signature → save.
Return flow: load pickup photos as reference → side-by-side capture → mark new damages → checklist → auto-generate damage report → decide deposit (release/charge).
Storage: `condition-photos/{org_id}/{booking_id}/{type}/{position}.jpg`.

#### M11: Dashboard (enhanced)
Single API call `GET /api/dashboard` (5min cache). Widgets: revenue 30 days (+month comparison), active rentals (+ overdue count), utilization rate %, today (pickups/returns), maintenance due, next 5 bookings with quick actions, revenue chart 12 months (Recharts), top 5 bikes by revenue.

#### M12: Public REST API
Routes under `app/api/v1/`. Endpoints: bikes (CRUD + availability), bookings (CRUD + cancel), customers (CRUD), pricing/calculate, availability overview. Auth: API key (Bearer token, SHA-256 hashed in DB). New table: `api_keys` (organization_id, key_hash, key_prefix, name, permissions TEXT[], last_used_at, expires_at, is_active). Rate limiting: 100 req/min per key. Cursor-based pagination. Outgoing webhooks: booking.created/cancelled/completed, payment.received, damage.reported (configurable URL per org). Settings → API: key CRUD + webhook config + test button.

#### M13: Embeddable booking widget
Separate Vite project under `/widget`. Output: single JS+CSS bundle (<100KB gzip). Embed via `<script src="https://widget.rentcore.app/embed.js">` + `<div data-tenant="ID" data-theme="light" data-lang="de" data-primary-color="#2B6CB0">`. Features: bike catalog grid, date picker, cart, coupon code field, Stripe checkout, confirmation. CSS isolation via Shadow DOM. Public API endpoints: `GET /api/public/[tenant]/bikes`, `GET /api/public/[tenant]/availability`, `POST /api/public/[tenant]/bookings`, `POST /api/public/[tenant]/checkout`. Add to organizations: `widget_enabled`, `widget_allowed_domains TEXT[]`, `widget_theme JSONB`. Settings → Widget: on/off, domain whitelist, color config, copy embed code.
