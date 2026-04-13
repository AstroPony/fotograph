# Fotograph — Architecture

## System Overview

```
User Browser
    │
    ▼
Next.js 14 (Vercel)
    ├── App Router pages + API routes
    ├── Supabase Auth (magic link / OAuth)
    └── Supabase Realtime (job progress)
         │
         ├──► Cloudflare R2 (presigned upload URL)
         │         └── stores: raw uploads, outputs
         │
         ├──► Trigger.dev (background job queue)
         │         └── Image Pipeline Job
         │               ├── Photoroom API (bg removal)
         │               ├── Replicate FLUX Schnell (preview)
         │               ├── Replicate FLUX.2 Pro (final)
         │               ├── Real-ESRGAN (upscale, optional)
         │               └── EXIF metadata write → R2
         │
         ├──► Supabase PostgreSQL (Prisma ORM)
         │         └── users, images, jobs, brand_presets, credits
         │
         └──► Mollie (subscriptions + credit packs)
```

---

## Image Generation Pipeline

```
1. User uploads product photo
        │
        ▼
2. Presigned R2 URL → direct browser upload (bypasses Next.js)
        │
        ▼
3. API route creates job record in DB → dispatches Trigger.dev task
        │
        ▼
4. Trigger.dev: Background Removal
   └── Photoroom API ($0.02/image)
   └── Output: transparent PNG → R2
        │
        ▼
5. Trigger.dev: Preview Generation (ALL previews use Schnell)
   └── Composite product on transparent layer
   └── FLUX Schnell via Replicate ($0.003/image)
   └── Runs 3-4 variants in parallel
   └── Outputs → R2, job status → Supabase Realtime
        │
        ▼
6. User selects favourite preview
        │
        ▼
7. Trigger.dev: Final Render (PROD only — Schnell in dev)
   └── FLUX.2 Pro via Replicate ($0.03/image)
   └── EXIF metadata written (AI Act compliance)
   └── Output → R2
        │
        ▼
8. Optional: Upscaling
   └── Real-ESRGAN via Replicate ($0.0024/image)
        │
        ▼
9. Download via presigned R2 URL
```

---

## Database Schema (Prisma — conceptual)

```prisma
model User {
  id            String   @id @default(cuid())
  supabaseId    String   @unique
  email         String   @unique
  tier          Tier     @default(FREE)
  creditsLeft   Int      @default(10)
  createdAt     DateTime @default(now())
  images        Image[]
  brandPresets  BrandPreset[]
}

model Image {
  id            String      @id @default(cuid())
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  status        JobStatus   @default(PENDING)
  rawR2Key      String      // original upload
  bgRemovedR2Key String?    // after Photoroom
  previewR2Keys  String[]   // FLUX Schnell outputs
  finalR2Key    String?     // FLUX.2 Pro output
  sceneTheme    String?
  customPrompt  String?
  createdAt     DateTime    @default(now())
}

model BrandPreset {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  name          String
  lightingDir   String?
  colorPalette  String?
  cameraAngle   String?
  sceneType     String?
}

enum Tier { FREE STARTER PRO BUSINESS }
enum JobStatus { PENDING REMOVING_BG GENERATING UPSCALING DONE FAILED }
```

---

## Cost Model

### Per-image API costs
| Operation | API | Cost |
|---|---|---|
| BG removal | Photoroom | $0.020 |
| Preview (×3) | FLUX Schnell | $0.009 |
| Final render | FLUX.2 Pro | $0.030 |
| Upscaling (optional) | Real-ESRGAN | $0.002 |
| **Total** | | **~$0.05–0.06** |

Smart routing (Schnell previews → user picks one → Pro final) cuts costs 60–70% vs generating all finals.

### Gross margins at €0.05/image
| Tier | Revenue | API cost | Margin |
|---|---|---|---|
| Starter €19 (50 img) | €19 | €2.50 | **87%** |
| Pro €49 (200 img) | €49 | €10.00 | **80%** |
| Business €99 (500 img) | €99 | €25.00 | **75%** |

### Infrastructure cost at launch: ~€0
Stacking free tiers: Supabase (500MB DB, 50K users), Vercel (hobby), Cloudflare R2 (10GB, 10M reads), Trigger.dev ($5/mo credit, 20 concurrent runs). Only real cost is AI API calls.

---

## Architectural Decision Records

### ADR-001: Trigger.dev for all AI generation
**Decision:** All Photoroom + Replicate calls run inside Trigger.dev tasks, never in Next.js API routes.  
**Reason:** Vercel serverless timeout is 10 seconds on hobby tier. AI generation takes 5–30 seconds. Trigger.dev has no execution timeout and is TypeScript-native with first-class Next.js support.  
**Consequence:** API routes only dispatch tasks and poll status.

### ADR-002: FLUX Schnell for previews, FLUX.2 Pro for finals
**Decision:** Generate 3–4 previews using FLUX Schnell ($0.003 each), let user pick, then render final with FLUX.2 Pro ($0.03).  
**Reason:** Users review 3–4 options before downloading one. Generating all options in Pro quality would cost 10× more. This routing cuts generation costs 60–70%.  
**Consequence:** Preview quality is lower (still good enough to judge scene/lighting). Final quality is production-grade.

### ADR-003: Cloudflare R2 over AWS S3
**Decision:** Use Cloudflare R2 for all image storage.  
**Reason:** R2 has zero egress fees. At scale (1TB stored + 100M reads): R2 costs ~$55/month vs S3 ~$968/month. Free tier includes 10GB storage and 10M reads.  
**Consequence:** S3-compatible API means minimal code difference. Must use R2-specific endpoint config in the AWS SDK.

### ADR-004: Mollie over Stripe for payments
**Decision:** Mollie for all payment processing.  
**Reason:** Already configured. Mollie handles iDEAL natively — iDEAL is used in 70–73% of Dutch online transactions. Not supporting it is leaving money on the table. Mollie also has strong Dutch market support and clear subscription + one-time payment APIs.  
**Consequence:** No Stripe SDK. Use `@mollie/api-client`. Webhook endpoint at `/api/mollie/webhook`.

---

## EU AI Act Compliance

The EU AI Act becomes fully applicable August 2, 2026. AI-generated images fall under "limited risk" with one key obligation: **transparency**.

Implementation:
- Every generated image has EXIF metadata set by the Trigger.dev job before R2 upload
- Metadata key: `XMP-dc:description` = `"AI-generated image created by Fotograph"`
- Optional visible disclosure watermark on free tier (already needed for the free plan anyway)
- This is both a legal requirement and a trust signal for merchants
