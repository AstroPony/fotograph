# Fotograph — AI Assistant Instructions

## Project Overview

AI product photo SaaS for Dutch e-commerce sellers (Bol.com, Shopify, WooCommerce). Generates lifestyle product photos from plain product images. Targeting Dutch market with Dutch-language UI, iDEAL payments, and Bol.com-specific templates.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Database | PostgreSQL via Supabase (Prisma ORM) |
| Auth | Supabase Auth (magic links + OAuth) |
| Payments | Mollie (subscriptions + credit packs, iDEAL native) |
| File storage | Cloudflare R2 (zero egress fees) |
| Background jobs | Trigger.dev (handles all AI generation — never use API routes directly) |
| Hosting | Vercel (frontend + API routes, NOT AI generation) |
| Email | Resend |
| AI — BG removal | Photoroom API |
| AI — Scene preview | Replicate: FLUX Schnell |
| AI — Scene final | Replicate: FLUX.2 Pro |
| AI — Upscaling | Replicate: Real-ESRGAN |

---

## Environment Variables

### Phase 1 (required to run locally)
```
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
```

### Phase 2 (add before MVP launch)
```
# Mollie
MOLLIE_API_KEY=
MOLLIE_WEBHOOK_SECRET=

# Resend
RESEND_API_KEY=
```

---

## Working Conventions

- **Never commit or push** unless explicitly asked
- **Never call FLUX.2 Pro in local dev** — always use FLUX Schnell for cost control ($0.003 vs $0.03)
- **All AI generation via Trigger.dev**, never directly from Next.js API routes (Vercel 10s timeout kills longer jobs)
- **Conventional commits**: `type(scope): description` (e.g. `feat(upload): add drag-and-drop zone`)
- Commit subject max 72 chars
- **EU AI Act compliance**: every generated image must have EXIF metadata tagging it as AI-generated — build this into the pipeline from day one, not as an afterthought

## Cost Guardrails

| Operation | API | Cost/image | Dev default |
|---|---|---|---|
| BG removal | Photoroom | $0.02 | OK in dev |
| Preview | FLUX Schnell | $0.003 | Always use this |
| Final render | FLUX.2 Pro | $0.03 | PROD ONLY |
| Upscaling | Real-ESRGAN | $0.0024 | Phase 3 |

Total per finished photo: ~$0.05–0.06

---

## Pricing Tiers (reference)

| Tier | Price | Images/mo | Notes |
|---|---|---|---|
| Free | €0 | 10 | Watermarked, 512px, 5 themes |
| Starter | €19 | 50 | 1024px, 15 themes, custom prompts |
| Pro | €49 | 200 | 2048px, all themes, batch (25), brand presets |
| Business | €99 | 500 | API access, batch (100), virtual models, priority |
| Credits | €10/pack | +25 | Pay-as-you-go add-on |

Gross margin at $0.05/image API cost: 87% (Starter) · 80% (Pro) · 75% (Business)

---

## Key Architecture Rules

1. Upload → Cloudflare R2 (direct via presigned URL, never through Next.js)
2. Trigger.dev job picks up the R2 key → runs pipeline → writes result back to R2
3. Supabase Realtime (or server-sent events) push progress to the client
4. Next.js API routes only handle: auth callbacks, Mollie webhooks, job status polling
5. EXIF metadata written to every output image by Trigger.dev job before R2 upload

---

## Target Market Notes

- Primary: Bol.com third-party sellers (20,000+, Dutch-speaking)
- Secondary: Shopify/WooCommerce merchants in NL/BE
- No competitor offers Dutch-language UI, Bol.com-specific templates, or iDEAL
- Bol.com image requirements: white background, 1200×1200px minimum for zoom, no watermarks
- Key Dutch SEO terms: "AI productfotografie", "product foto bewerken", "achtergrond verwijderen product"
