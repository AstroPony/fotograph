# Fotograph

AI product photo SaaS for Dutch e-commerce sellers. Removes product backgrounds via Photoroom, generates clean studio/lifestyle backgrounds via FLUX Schnell (Replicate), and composites the result — all from a Next.js front-end backed by Trigger.dev background jobs.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Database | PostgreSQL via Supabase (Prisma ORM) |
| Auth | Supabase Auth (magic links) |
| Payments | Stripe (subscriptions + credit packs) |
| File storage | Cloudflare R2 |
| Background jobs | Trigger.dev v4 |
| Email | Resend |
| BG removal | Photoroom API |
| Scene generation | Replicate — FLUX Schnell (solid scenes: Sharp only) |

---

## Prerequisites

- Node.js 20+
- A Supabase project
- A Cloudflare R2 bucket
- Replicate, Photoroom, Resend, and Stripe API keys
- A Trigger.dev project (v3 cloud)

---

## Setup

```bash
npm install
```

Copy the env template and fill in every value:

```bash
cp .env.example .env.local
```

### Required environment variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Replicate
REPLICATE_API_TOKEN=

# Photoroom
PHOTOROOM_API_KEY=

# Cloudflare R2
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET_NAME=
CLOUDFLARE_R2_PUBLIC_URL=

# Trigger.dev
TRIGGER_SECRET_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Resend
RESEND_API_KEY=
```

### Database

```bash
npx prisma generate
npx prisma db push
```

---

## Running locally

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

To run the Trigger.dev background job worker locally:

```bash
npx trigger.dev@4.4.4 dev
```

---

## Tests

```bash
npm test          # run once
npm run test:watch  # watch mode
```

Tests cover:

- **Scene data integrity** — every scene has required fields, solid scenes have empty prompts, generated scenes have meaningful prompts, bgColor channels are in range
- **Platform → scene references** — every scene ID referenced by a platform exists in `SCENE_MAP`
- **Legacy scene ID remap** — every pre-rename ID maps to a valid current scene and is no longer a current scene itself
- **Translation completeness** — NL and EN have identical key sets; every scene and platform has its translation entries; no blank values

---

## Pre-push hook

The repo ships a pre-push hook at `.githooks/pre-push` that runs TypeScript check → tests → a manual rating prompt (must enter ≥ 9 to allow the push).

**Activate it once after cloning:**

```bash
chmod +x .githooks/pre-push
git config core.hooksPath .githooks
```

When you push from a real terminal, the hook will:

1. Run `tsc --noEmit`
2. Run `npm test`
3. Ask you to run the `/programming-excellence` rating in Claude and enter the score — push is blocked if the score is below 9

The rating prompt is skipped automatically in CI or other headless environments where no TTY is available.

---

## Deploying the Trigger.dev pipeline

Any change to `src/trigger/` must be deployed separately from the Next.js app:

```bash
CI=false npx trigger.dev@4.4.4 deploy
```

> **Cost note:** never trigger FLUX Schnell calls from local dev unless testing the pipeline end-to-end. Solid-colour scenes (white, gray) use Sharp only and cost nothing.

---

## Email templates

Auth emails (magic link, confirm signup, etc.) are stored locally at `docs/email-templates/` for reference. They are **not deployed automatically** — paste each one manually into:

> Supabase dashboard → Authentication → Email Templates

The templates are gitignored (`/docs`) to keep them off the public repo.

---

## Scenes

Six scenes across two types:

| ID | Type | Description |
|---|---|---|
| `white-seamless` | Solid | Pure white — Sharp only, no AI |
| `soft-shadow` | Solid | White + Photoroom contact shadow |
| `light-gray` | Solid | Light gray — Sharp only |
| `marble-white` | Generated | FLUX Schnell — white Carrara marble |
| `light-wood` | Generated | FLUX Schnell — light oak surface |
| `dark-concrete` | Generated | FLUX Schnell — dark matte concrete |

Scenes are filtered by platform (Bol.com, Shopify, WooCommerce, Amazon.nl, Etsy) in the upload and batch flows.

Pre-rename scene IDs (e.g. `bol-white-seamless`, `editorial-marble`) are remapped automatically by the pipeline so queued jobs are never lost after a scene rename.
