# Fotograph — TODO

Track progress here. Update checkboxes as items are completed. Add notes inline.

---

## Phase 1 — Proof of Concept (Weeks 1–2)
Goal: working local pipeline. Upload a real product photo, get a lifestyle scene out.

- [ ] Scaffold Next.js 14 project (TypeScript, Tailwind CSS, shadcn/ui)
- [ ] Supabase project setup (auth, PostgreSQL database, enable Realtime)
- [ ] Prisma schema: `users`, `images`, `brand_presets` tables + migrations
- [ ] Basic upload UI — drag-and-drop single image, show preview
- [ ] Presigned R2 URL flow — browser uploads directly to Cloudflare R2
- [ ] Photoroom API integration — background removal, store result in R2
- [ ] Replicate FLUX Schnell integration — scene generation from text prompt
- [ ] Trigger.dev job: upload → bg remove → FLUX Schnell → store output in R2
- [ ] Supabase Realtime — push job progress to client (pending → generating → done)
- [ ] Download flow — presigned R2 URL for final image
- [ ] Local end-to-end test with a real Bol.com product photo

---

## Phase 2 — Functional MVP (Weeks 3–4)
Goal: chargeable product. Real users can sign up, generate, and pay.

- [ ] Mollie integration — subscription plans (Starter/Pro/Business) + credit pack purchases
- [ ] Mollie webhook handler at `/api/mollie/webhook` — update credits/tier on payment
- [ ] 15 preset scene themes with curated FLUX prompt templates
  - Examples: "marble kitchen counter", "outdoor garden", "minimalist studio", "wooden shelf", "lifestyle flat lay"
- [ ] Smart routing — FLUX Schnell for 3 previews → user picks → FLUX.2 Pro for final render
- [ ] User dashboard — generation history, image grid, download links, credits remaining
- [ ] Credit deduction on generation — enforce tier limits (free: 10/mo, etc.)
- [ ] Mobile-responsive design pass
- [ ] Batch upload — up to 10 images processed in parallel via Trigger.dev
- [ ] Watermark on free tier output (512px, Fotograph logo overlay)
- [ ] Deploy to Vercel (frontend) + Supabase prod project

---

## Phase 3 — Production Hardening (Weeks 5–8)
Goal: ready for public launch and outreach.

- [ ] Custom text prompt input (Starter+ tier)
- [ ] Export sizes: 512px (watermarked, free), 1024px (Starter), 2048px (Pro+)
- [ ] Real-ESRGAN upscaling option (Pro+ tier)
- [ ] Email notifications via Resend — job complete, welcome, low credits warning
- [ ] Landing page — Dutch primary, English toggle
  - Hero with before/after examples
  - Pricing table
  - "Bol.com seller" specific messaging
  - SEO: "AI productfotografie", "product foto bewerken", "achtergrond verwijderen"
- [ ] Free "Bol.com Product Photo Checklist" lead magnet (PDF download)
- [ ] EU AI Act: EXIF metadata on all generated images (built into Trigger.dev job)
- [ ] Error handling — failed jobs retry logic, user-facing error messages
- [ ] Rate limiting — per-user request throttling
- [ ] Analytics — PostHog or Plausible (privacy-friendly, GDPR-safe)
- [ ] Brand preset "style lock" system (Pro+ differentiator)
  - Save: lighting direction, color palette, camera angle, scene type
  - Apply across batch generations for brand consistency
- [ ] iDEAL via Mollie — already supported, verify checkout flow works end-to-end
- [ ] Annual billing option (20% discount)

---

## Post-Launch / Growth

- [ ] Dutch-language blog posts (target zero-competition keywords)
- [ ] Shopify App Store submission ($19 one-time fee, 0% rev share on first $1M)
- [ ] Bol.com Integrator Program application (Content API for direct image upload)
- [ ] WooCommerce plugin (WordPress plugin directory — free listing)
- [ ] First 5 customers: personalized demo strategy (find bad Bol.com listings, generate before/after)
- [ ] Webwinkelforum.nl community presence
- [ ] Virtual model try-on via FASHN.ai ($0.075/image) — post-MVP premium feature
- [ ] Self-host Bria RMBG for background removal at scale (eliminate Photoroom costs)

---

## Notes

- FLUX.2 Pro = PROD only. Always use Schnell locally to control costs.
- Mollie test mode available — use test API key in `.env.local`
- Bol.com image spec: white background, 1200×1200px min, no watermarks or promo text
- EU AI Act fully applicable August 2, 2026 — build EXIF compliance in Phase 1, not Phase 3
