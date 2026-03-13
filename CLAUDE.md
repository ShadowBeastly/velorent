# CLAUDE.md — Lociva Platform Context

## Project Overview

**Lociva** (lociva.de) is a local activities marketplace for hotel guests. Hotels get a free digital concierge (QR code in rooms), guests scan and book local activities, providers get paid automatically via Stripe Connect. Lociva earns 5-15% commission per booking.

**Previous names:** VeloRent, RentCore, Lokadex, Xlocal
**Domain:** lociva.de (purchased March 2026)
**Founder:** Christopher Funke, funk-e.solutions
**Codebase:** github.com/ShadowBeastly/velorent (to be transformed into Lociva)

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

**Logic:** Bikes have thin margins → 5%. Experiences have higher margins → 10-15%. For comparison: GetYourGuide charges 20-30%.

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

## Competitive Positioning

| Feature | Lociva | GetYourGuide | Viator | ListNRide | Donkey Republic | Local Portals |
|---------|--------|-------------|--------|-----------|-----------------|--------------|
| Hotel as channel | ✅ | ❌ | ❌ | ❌ | ❌ | Partial |
| Online payment | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Locally curated | ✅ | ❌ | ❌ | Partial | ❌ | ✅ |
| Commission model | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Free for hotels | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Multi-activity | Phase 2 | ✅ | ✅ | ❌ | ❌ | Partial |
| DACH focus | ✅ | ❌ | ❌ | Partial | Partial | ✅ |

**Key insight:** No competitor combines hotel distribution + local curation + integrated payment. Lociva occupies a unique position: hyperlocal + strong hotel integration.

---

## Scaling Strategy

### Phase 1 — Summer 2026: Pilot
- 5 hotels, 2-3 bike shops, Rhein-Main only
- Only bikes/e-bikes
- Personal sales (door-to-door with cookies)
- Tandem approach: secure bike shop first, then approach hotel with concrete offering
- Goal: Proof of Concept, measure scan-to-booking conversion
- Expected: 1,800 bookings, 81,000 € volume, 4,050 € commission

### Phase 2 — 2027: Regional Expansion
- 6 regions (Rhein-Main + 5 new: Bodensee, Schwarzwald, Ostsee, etc.)
- 80 hotels via regional scouts (commission-based, no salary)
- 4 categories: E-Bikes, Canoe, Climbing, Guided Tours
- Expected: 60,000 bookings, 2,820,000 € volume, 216,600 € commission
- Key insight: Experience categories make 40% of bookings but 63% of Lociva revenue

### Phase 3 — 2028+: DACH Expansion
- 30+ regions, 500+ hotels
- 8+ categories including Escape Room, Go-Kart, Wine Tasting, Wellness, Premium
- Expected: 560,000 bookings, 28,880,000 € volume, 2,732,000 € commission

### Long-term: 1,000 Hotels
- Full category catalog
- 1,600,000 bookings/season
- 83,200,000 € volume
- **7,737,600 € commission** (weighted avg 9.3% across categories)
- Multi-category triples revenue per hotel vs. bikes-only

### Scout Model (Franchise-like)
- Scouts get exclusive region + playbook + platform access
- Revenue share: 20-30% of Lociva's commission (1-1.5% of booking volume)
- Example: Region with 20 hotels = 1,500-2,250 €/month for scout
- Winter: onboarding bonus per hotel (100-200 € one-time) + revenue share from season
- Target scouts: tourism managers, retired hoteliers, local event organizers, bike enthusiasts

### Scaling Priority Order
1. **Supply first, not demand.** Saturate providers in one region before adding hotels.
2. **One region deep, not many regions shallow.** 15-20 hotels in Rhein-Main before expanding.
3. **New categories in existing regions** before new regions. Each existing hotel gets expanded catalog automatically.
4. **Geographic expansion** only with proven playbook and scout model.

---

## Seasonality Strategy

**Problem:** Bike rentals = 8 months, 4 months zero revenue.

**Solution:** Multi-category expansion eliminates the problem.

| Category | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|----------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| E-Bikes | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| Canoe/SUP | — | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — |
| Climbing Park | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| Guided Tours | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Escape Room | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Indoor Go-Kart | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Wellness/Spa | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | ✅ | ✅ | ✅ |
| Wine/Culinary | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Christmas Markets | — | — | — | — | — | — | — | — | — | — | ✅ | ✅ |
| Ski/Snowshoe | ✅ | ✅ | ✅ | — | — | — | — | — | — | — | — | ✅ |

**Result:** Every month has at least 3 active categories. Even February has Escape Room, Indoor Kart, Wellness, and Ski.

**Additional winter strategies:**
- Premium listings (monthly fee from providers, runs year-round)
- Winter = sales season (hotels plan ahead, providers have time)
- Prioritize cities with year-round tourism (Frankfurt, Munich, Hamburg)
- Consulting (funk-e.solutions) as bridge in Phase 1-2

---

## Technical Architecture

### Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 18, Tailwind CSS v3 |
| Backend/DB | Supabase (PostgreSQL + Auth + RLS + Edge Functions) |
| PDF | jsPDF + jspdf-autotable |
| Charts | Recharts |
| Drag & Drop | @dnd-kit |
| Email | Brevo Transactional API |
| Deployment | Vercel |

### Reusable from VeloRent
- Booking calendar (Gantt view, drag & drop)
- 4-step booking wizard with conflict checking
- Group bookings (booking_items)
- Add-ons / accessories (per_day or flat)
- Deposit tracking (pending → held → refunded/deducted)
- Handover/return protocol (JSONB)
- Customer management
- Invoices (jsPDF, sequential numbers)
- Maintenance log with calendar integration
- Dashboard (Recharts, activity feed)
- Pricing rules engine
- Vouchers / discount codes
- Booking widget (iframe-embeddable)
- Multi-tenancy via RLS (organization_id)
- Roles: Owner / Admin / Member / Viewer
- GDPR cookie banner with audit trail
- Dark mode, responsive design

### New Data Model (additions for Lociva)

#### New Table: hotels
```sql
- id: UUID PK
- name: TEXT
- slug: TEXT UNIQUE (URL-friendly, e.g. "steigenberger-ffm")
- address: TEXT
- latitude: DECIMAL
- longitude: DECIMAL
- contact_email: TEXT
- commission_pct: DECIMAL DEFAULT 0 (hotel commission %, 0 = none)
- qr_code_url: TEXT
- region_id: UUID FK → regions
- is_active: BOOLEAN DEFAULT true
- created_at: TIMESTAMPTZ
```

#### New Table: hotel_providers (hotel ↔ provider mapping)
```sql
- hotel_id: UUID FK → hotels
- organization_id: UUID FK → organizations
- distance_km: DECIMAL
- is_active: BOOLEAN DEFAULT true
```

#### New Table: regions
```sql
- id: UUID PK
- name: TEXT (e.g. "Rhein-Main", "Bodensee")
- scout_user_id: UUID FK → profiles (NULL if no scout assigned)
```

#### New Table: analytics_events
```sql
- id: UUID PK
- hotel_id: UUID FK → hotels
- event_type: TEXT ('qr_scan' | 'page_view' | 'booking_start' | 'booking_complete')
- metadata: JSONB
- created_at: TIMESTAMPTZ
```

#### Extended: organizations (add Stripe fields)
```sql
+ stripe_account_id: TEXT
+ stripe_verified: BOOLEAN
```

#### Extended: bookings (add platform fields)
```sql
+ hotel_id: UUID FK → hotels (NULL = direct booking)
+ stripe_payment_intent_id: TEXT
+ stripe_transfer_id: TEXT
+ platform_commission: DECIMAL
+ hotel_commission: DECIMAL DEFAULT 0
+ booking_source: TEXT DEFAULT 'direct' ('hotel_qr' | 'direct' | 'widget')
+ guest_email: TEXT
+ guest_phone: TEXT
+ guest_language: TEXT DEFAULT 'de'
+ cancellation_status: TEXT ('none' | 'free' | 'partial' | 'no_show')
```

### Four User Types / Views

1. **Hotel Guest (unauthenticated)**
   - QR code → /hotel/[hotel-slug]
   - Sees all providers near hotel
   - Books in 3 steps (choose bike → dates → pay)
   - Pays via Stripe Checkout
   - Confirmation via email/SMS
   - No account needed, no login
   - Multilingual: DE / EN

2. **Provider (bike shop / activity operator)**
   - Login → Provider Dashboard
   - Register with AGB acceptance
   - Stripe Connect Express onboarding (KYC)
   - Manage bikes/activities (type, price, photos, description)
   - Manage real-time availability
   - View/confirm incoming bookings
   - View payouts (automatic via Stripe)

3. **Hotel**
   - Login → Hotel Dashboard (read-only)
   - View booking stats from their QR code
   - View revenue volume (and optional commission)
   - Download QR code materials
   - Minimal functionality, no training needed

4. **Platform Admin (Lociva)**
   - Login → Admin Panel
   - Manage all hotels, providers, regions
   - Assign hotels to providers (radius/region)
   - Commission settings per category
   - Global analytics: volume, revenue, conversion
   - Scout management (which scout → which region)
   - QR code generator per hotel

### Stripe Connect Architecture

- **Platform account:** Lociva's Stripe account
- **Connected accounts:** Each provider has Stripe Express account
- **Recommendation:** Stripe Express (simplified onboarding, Stripe handles KYC)

**Booking flow:**
1. Guest selects bike/activity and dates
2. Platform creates Stripe Checkout Session with `payment_intent_data.application_fee_amount` (= Lociva's commission)
3. Guest pays via Stripe Checkout (card, Apple Pay, Google Pay)
4. Stripe splits automatically: % to Connected Account, % to Platform Account
5. Hotel commission (if any): separate transfer or manual invoice
6. Provider gets automatic payout per Stripe payout schedule

**Cancellation in Stripe:**
- Free cancellation (>24h): Full refund, application_fee also refunded
- 50% cancellation (<24h): Partial refund via Stripe API, fee adjusted proportionally
- No-show: No refund, normal transfer proceeds

### Build Priorities

#### Phase A: Foundation (April 2026) — 10-16 days
- [ ] Extend data model (hotels, hotel_providers, new booking columns) — CRITICAL
- [ ] RLS policies for new tables — CRITICAL
- [ ] Stripe Connect setup (platform account, Express onboarding flow) — CRITICAL
- [ ] Provider Stripe Express onboarding UI — CRITICAL
- [ ] Hotel entity in Admin — HIGH
- [ ] Hotel-Provider mapping in Admin — HIGH

#### Phase B: Guest Booking Flow (April-May 2026) — 13-21 days
- [ ] QR code landing page (/hotel/[slug]) — CRITICAL
- [ ] Provider list view (filtered by hotel region) — CRITICAL
- [ ] 3-step booking flow (bike, dates, pay) — CRITICAL
- [ ] Stripe Checkout integration with application_fee — CRITICAL
- [ ] Booking confirmation email — HIGH
- [ ] Analytics events (qr_scan, page_view, etc.) — HIGH
- [ ] i18n DE/EN — MEDIUM

#### Phase C: Dashboards (May 2026) — 11-17 days
- [ ] Simplified Provider Dashboard — HIGH
- [ ] Hotel Dashboard (read-only) — MEDIUM
- [ ] Admin Panel (hotels, providers, regions) — HIGH
- [ ] QR code generator in Admin — MEDIUM
- [ ] Cancellation flow (24h/50%/no-show) — HIGH

**Total estimate: 34-54 days (5-8 weeks with Claude Code)**

### Explicitly NOT in MVP
- Mobile app (React Native) — after web validation
- Booking.com / Channel Manager integration — too complex
- Automatic radius calculation (PostGIS) — manual hotel↔provider mapping
- Hotel WiFi portal integration — requires per-hotel IT coordination
- Extended categories (kart, canoe, etc.) — after bike validation
- Automated scout billing — manual Excel/Notion in year 1
- i18n beyond DE/EN — only when expanding beyond DACH

---

## Legal Framework

- **Lociva's role:** Vermittler (intermediary), NOT Vermieter (lessor) or Veranstalter (organizer)
- **Rental contract:** Between guest and provider, not involving Lociva
- **Hotel liability:** None. Hotel merely recommends a service (like a restaurant recommendation)
- **Provider requirement:** Must have Betriebshaftpflichtversicherung (business liability insurance)
- **Lociva insurance:** Vermögensschadenhaftpflicht (professional liability, ~300-800 €/year)
- **Legal structure:** Start via existing Gewerbe (sole proprietorship), UG (haftungsbeschränkt) when significant revenue flows
- **AGB:** Two sets needed:
  1. Guest AGB: Intermediary role, cancellation policy, data privacy
  2. Provider AGB: Commission rates, liability insurance requirement, Stripe payout terms, availability self-managed
- **AGB approach:** Self-created for pilot, lawyer review (~200-400 €) before scaling

---

## Key Metrics to Track

| KPI | Target | Method |
|-----|--------|--------|
| QR scans per hotel/month | > 100 | Analytics tracking |
| Scan-to-booking conversion | > 10% | Funnel analysis |
| Bookings per hotel/month | > 30 | Booking database |
| Cancellation rate | < 15% | Stripe data |
| Guest NPS | > 40 | Post-booking survey |

**Most critical metric:** Scan-to-booking conversion. If 100 guests scan and 10+ book, the model works. If only 2 book, it doesn't.

---

## Financing

- **Phase 1:** Gründungszuschuss (startup grant via KIZ Offenbach) + parallel consulting (funk-e.solutions)
- **No external investors** in Phase 1
- **Equity dilution:** Only if necessary for scaling after successful Proof of Concept
- **Monthly costs Phase 1:** ~30-70 € (Vercel free, Supabase free, Stripe transaction-based only)

---

## Sales Approach

### Provider Pitch (Bike Shop)
1. **Listen first:** How do customers find you? Do you work with hotels? How do people book?
2. **Bridge:** Connect their pain point to your solution
3. **60-second pitch:** "QR code in hotels → guests see your bikes → book and pay online → you get guaranteed bookings with pre-payment. 5% commission only when bookings happen."
4. **Handle objections:**
   - "5% is too much" → Calculate: 30 extra bookings × 45€ = 1,350€ revenue, 5% = 67.50€. You net 1,282€ you didn't have.
   - "I have enough customers" → "These are additional hotel guests who don't google. They come on top."
   - "I want to see if it works first" → "Exactly why we're doing a pilot. If zero bookings come, it costs you zero."
5. **Close:** "I'm starting in June. Should I set you up as one of the first partners in the region?"

### Hotel Pitch
- Lead with: "Free digital concierge for your guests"
- Show concrete offering: "Your guests can book e-bikes from [specific shop] starting now"
- Address the three questions every director asks: "What does it cost?" (Nothing), "Am I liable?" (No), "What does my staff do?" (Nothing, optionally mention QR code)
- Leave QR code materials, follow up in one week

### Go-to-Market: Tandem Approach
1. Secure bike shop first (supply)
2. Go to hotel with concrete offering (demand)
3. Never approach hotel without having providers ready

---

## Key Decisions Made

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Brand name | Lociva | Warm, international, "loc" = local + "iva" = viva |
| Domain | lociva.de | .de sufficient for DACH start |
| Hotel commission | Test after pilot (Scenario C) | No data yet, start without, decide based on results |
| Provider contracts | AGB-based (accept on registration) | Scales better than individual contracts |
| Payment | Always online via Stripe Connect | Prevents disintermediation |
| Languages | DE + EN for launch | Covers 90%+ of Rhein-Main guests |
| Legal structure | Existing Gewerbe, UG later | Low cost to start, UG when real money flows |
| Who to approach first | Bike shop then hotel (tandem) | Can't pitch hotel without concrete offering |
| Provider competition | No exclusivity, all welcome | Take every provider in Phase 1 |
| Cancellation | Tiered (24h free / <24h 50% / no-show 100%) | Industry standard, familiar to guests |
| Hotel-provision | Data-driven after pilot | No provision initially, test if it increases bookings |

---

## Files Created

1. `Plattform-Konzept.docx` — Full 13-section concept document (KIZ/businessplan ready)
2. `Technische-Anforderungen.docx` — Complete technical requirements with data model and task estimates
3. `Lociva-Geschaeftskonzept.docx` — Simple business concept for KIZ/Bank/Förderung
4. `Lociva-Geschaeftskonzept-MultiKategorie.docx` — Extended version with multi-category expansion calculations

---

## Dev Commands

```bash
npm run dev       # Start dev server at localhost:3000
npm run build     # Production build (runs ESLint + type check first)
npm run lint      # ESLint only
npm run start     # Start production server (after build)
```

No test runner is configured. There are no unit/integration tests.

---

## Codebase Architecture Notes

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

Provider hierarchy (only inside `/app/*`):

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

**Org guard**: `app/app/layout.jsx` shows `OnboardingPage` if `!org.currentOrg`. Middleware handles unauthenticated redirects.

### Supabase Data Hooks Pattern

Each hook (e.g. `useBookings.js`) follows the same shape:
```js
const [items, setItems] = useState([]);
// load() fetches all items for the current orgId
// Returns: { items, loading, create, update, remove, reload }
```
All hooks import `supabase` from `../utils/supabase` (browser singleton). Changing the org re-triggers `useEffect` via `orgId`.

### Architecture Gotchas

- `daysDiff(a, b)` in `src/utils/formatters.js` returns an **inclusive** day count (already has `+1` built in) — do NOT add another `+1` at call sites
- `src/utils/navigationItems.js` is the single source of truth for sidebar links and URL paths
- All `src/` components are Client Components (`"use client"`)
- Auth: `signIn`/`signUp` throw on error (don't return `{ error }`) — callers must use try/catch
- Booking widget is isolated from Auth, uses separate API key (`public_api_key`)
- Viewer role: `get_user_write_org_ids()` returns only org IDs where user ≠ viewer — all write policies use this function

### Multi-Tenancy / RLS

All Supabase tables have Row Level Security. Data is scoped to `organization_id`. The `organization_members` table links users to organizations with roles (`owner`, `admin`, `member`, `viewer`). Current org persisted in `localStorage` as `currentOrgId`.

### ESLint Notes

- `react-refresh/only-export-components` is disabled for `app/**` (Next.js uses named exports like `metadata` alongside default component exports)
- `globals.node` is included so `process.env.*` is recognized without lint errors

### Deployment

Deploy with `vercel --prod`. Critical production constraints:

- `app/layout.jsx` must export `export const dynamic = "force-dynamic"` — do NOT remove. Prevents static generation of `/_not-found` which breaks Supabase SSR cookie reading.
- `src/utils/supabase.js` uses `|| "placeholder"` fallbacks — `createBrowserClient` throws synchronously if URL/Key are empty (even during build).
- If Vercel builds succeed in ~126ms without running `next build`, check `outputDirectory` setting — empty string causes Vercel to skip the build entirely. Fix: set `outputDirectory` to `null`.

### Database Setup

Run in order in Supabase SQL Editor:
1. `supabase-schema.sql` — core tables + RLS
2. `supabase-public-booking.sql` — booking widget API extension

Environment variables required:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
