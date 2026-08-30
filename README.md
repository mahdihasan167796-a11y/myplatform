# MyPlatform

Multi-tenant dropshipping SaaS — each merchant gets a subdomain storefront, off one shared supplier catalog and one dashboard.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set `DATABASE_URL` to your Supabase or Neon Postgres connection string.

3. Run the first migration (creates the schema, generates the Prisma client, and seeds demo data):
   ```bash
   npx prisma migrate dev --name init
   ```

4. Start the dev server:
   ```bash
   npm run dev
   ```

## Try it

`*.localhost` resolves automatically in Chrome/Firefox — no `/etc/hosts` editing needed.

- Dashboard login: http://app.localhost:3000/login
  — `admin@myplatform.com`, `owner@ihdamart.example`, or `owner@dailydeals.example`, password `ChangeMe123!` for all three
- Dashboard home: http://app.localhost:3000
- Storefronts: http://ihdamart.localhost:3000 and http://dailydeals.localhost:3000

## What's still a placeholder

- **Auth** (`lib/session.ts`) trusts a `session_user_id` cookie directly — no signing, no expiry. Fine for local testing, replace before anything near production.
- **Purchases, Customers, Accounts** have nav links but no `page.tsx` yet.
- **Facebook Pixel / GTM IDs** are captured on the Preferences page but not yet injected into the storefront's `<head>`.
- `app/page.tsx` is a placeholder marketing page for the bare apex domain.
- Product and logo images are plain URLs — no file upload.
- Order numbers are sequential per tenant via a `count()` query — fine for now, worth a real counter before concurrent checkout traffic.

## Stack

Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS v4 · Prisma 7 · PostgreSQL
