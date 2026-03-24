# CLAUDE.md

## Product Context
This monorepo contains two products:

- **RentCore**: B2B booking software for rental and activity providers
- **Lociva**: hotel guest marketplace for booking local activities via QR code

RentCore is the provider operating system. Lociva is the hotel distribution layer on top.

Guest flow:
- QR in hotel → `/hotel/[slug]`
- browse offers
- Stripe Checkout
- confirmation email
- no login required

## Core Business Rules
- Commission is calculated in `create_guest_booking`
- Cancellation is token-based
- Refund logic:
  - more than 24h before start = 100% refund
  - less than 24h = 50% fee
  - no-show = 100% charged

## Stack
- Next.js 15 App Router
- React 18
- Tailwind CSS v3
- Supabase
- PostgreSQL
- Stripe Connect
- Brevo Transactional Email
- Vercel

## Architecture Rules
- Frontend is UI only
- Business logic belongs in Supabase RPCs / DB / Edge Functions
- Do not move core booking or refund logic into client components
- All `src/` components are Client Components
- All app-internal data is organization-scoped

## Data Flow
Provider hierarchy inside `/app/*`:

AuthProvider  
→ OrgProvider  
→ AppProvider  
→ DataProvider

Hook pattern:
- `{ items, loading, create, update, remove, reload }`

## Critical RPCs
- `get_hotel_with_providers`
- `create_guest_booking`
- `get_booking_by_token`
- `cancel_booking_by_token`
- `get_hotel_analytics`
- `track_analytics_event`

Treat these as the source of truth for marketplace and booking behavior.

## Auth / Access Rules
- Guest booking flow is fully unauthenticated
- Public booking logic uses RPC with anon key
- All protected app data is scoped by `organization_id`
- Viewer users must not receive write access
- Admin area is for superadmin only

## Important Gotchas
- `daysDiff(a, b)` is inclusive and already adds `+1`
- `signIn` / `signUp` throw on error, they do not return `{ error }`
- `navigationItems.js` is the single source of truth for sidebar navigation
- Current org is persisted in `localStorage` as `currentOrgId`
- Booking widget uses a separate `public_api_key`

## Coding Rules
- Prefer existing patterns over inventing new ones
- Prefer extending current hooks, RPCs, and providers over introducing parallel abstractions
- Keep organization scoping explicit
- Use try/catch for auth actions
- Do not duplicate navigation definitions
- Do not add extra `+1` around date duration logic
- Keep guest booking login-free

## Deployment Rules
- Keep `export const dynamic = "force-dynamic"` in `app/layout.jsx`
- Do not remove Supabase placeholder fallbacks in browser client setup
- If Vercel skips proper Next build, check `outputDirectory` and set it to `null`

## Environment
Required env vars:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Supabase Edge Function secrets:
- `BREVO_API_KEY`
- `FROM_EMAIL`
- `FROM_NAME`

## Decision Rules
Use:
- **RPC** for booking, cancellation, commission, analytics, and DB-driven business logic
- **Edge Functions** for Stripe, email, and external service orchestration
- **Client code** for UI state only

## Do Not Include
- long explanations
- project history
- generated init output
- obvious framework usage notes
- duplicate directory walkthroughs unless needed for a task