# CLAUDE.md

## Products
Two products, one repo:
- **RentCore** (`rentcore.de`) — B2B provider dashboard for rental/activity operators
- **Lociva** (`lociva.de`) — Hotel guest marketplace; hotels place QR codes, guests book without login

## Stack
- Next.js 16 (App Router), React 19, Tailwind CSS v3
- Supabase (Postgres + Auth + RLS + Edge Functions)
- Stripe Connect Express
- Brevo (transactional email)
- Vercel

## Routing
- `proxy.ts` — Next.js 16 middleware (renamed from `middleware.ts`), exports `proxy` not `middleware`
- `/hotel/[slug]` — public guest booking flow (unauthenticated)
- `/hotel/*` — Lociva hotel dashboard (role: `hotel`)
- `/app/*` — RentCore provider dashboard (role: `provider` / any org member)
- `/app/admin/*` — platform admin (role: `superadmin` only)
- `/demo` — auto-signs in demo account, redirects by role

## Auth
- `useProvideAuth` in `src/hooks/useProvideAuth.js` — single source of truth
- `signIn` / `signUp` throw on error — always use try/catch
- Sign-out does `window.location.href = "/login"` (hard reload to reset all React state)
- Guest booking: fully unauthenticated, uses anon key RPCs

## Provider hierarchy (`/app/*`)
```
AuthProvider → OrgProvider → AppProvider → DataProvider → AppShell
```
Hook pattern: `{ items, loading, create, update, remove, reload }`

## Business logic rules
- **Never** put booking/refund/commission logic in client components
- Business logic → Supabase RPCs or Edge Functions
- Edge Functions → Stripe, email, external APIs
- RLS enforces org scoping — all queries are implicitly tenant-scoped

## Critical RPCs
- `create_guest_booking` — commission calculation lives here
- `cancel_booking_by_token` — refund: >24h=100%, <24h=50%, no-show=0%
- `get_hotel_with_providers`, `get_booking_by_token`, `get_hotel_analytics`, `track_analytics_event`

## Navigation
- RentCore sidebar: `src/utils/navigationItems.js`
- Lociva sidebar: `src/utils/locivaNavigationItems.js`
- Never duplicate — these are the single source of truth

## Gotchas
- `daysDiff(a, b)` already adds `+1` (inclusive) — don't add another
- `currentOrgId` persisted in `localStorage`
- Booking widget uses a separate `public_api_key`, isolated from auth
- `app/layout.jsx` must keep `export const dynamic = "force-dynamic"`
- `src/utils/supabase.js` must keep `|| "placeholder"` fallbacks (`createBrowserClient` throws synchronously if args are falsy)
- `outputDirectory` in Vercel project must be `null` (not empty string)
- All `src/` components are Client Components (`"use client"`)

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
