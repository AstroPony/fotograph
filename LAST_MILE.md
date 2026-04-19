# Fotograph — Last Mile

Everything needed before the app is genuinely production-ready.

---

## 1. Environment Variables (Vercel Dashboard)

Go to **Vercel → Project → Settings → Environment Variables** and add:

| Variable | Value | Notes |
|---|---|---|
| `MOLLIE_API_KEY` | `live_xxxxx` | Mollie dashboard → Developers → API keys. Use `test_xxx` for staging. |
| `RESEND_API_KEY` | `re_xxxxx` | Resend dashboard → API Keys |
| `NEXT_PUBLIC_APP_URL` | `https://fotograph.nl` | Used for Mollie redirect + webhook URLs. Must be your production domain. |
| `ADMIN_EMAILS` | `nightmedow@gmail.com` | Comma-separated. These accounts skip credit checks and start with 99999 credits + Business tier. |

All other env vars (Supabase, R2, Replicate, Photoroom, Trigger.dev) should already be set.

---

## 2. Database Migration

The v1.0 schema added `MolliePayment`, `mollieCustomerId`, and `subscriptionEndsAt`. Run this once against your Supabase database:

```bash
npx prisma migrate dev --name add-mollie-payments
```

Or in production (no dev prompt):

```bash
npx prisma migrate deploy
```

You can also run it via Vercel's build command by prepending:
`npx prisma migrate deploy && npm run build`

---

## 3. Mollie Setup

1. Create a [Mollie account](https://mollie.com) and verify your business
2. In the Mollie dashboard, go to **Developers → Webhooks** — no manual setup needed, the URL is passed per-payment
3. Add your domain to the **Allowed redirect URLs** list: `https://fotograph.nl/*`
4. For local testing, use [ngrok](https://ngrok.com): `ngrok http 3000` → use the ngrok URL as `NEXT_PUBLIC_APP_URL`
5. Switch from `test_` to `live_` API key when ready to take real payments

---

## 4. Resend Setup

1. Create a [Resend account](https://resend.com)
2. Verify your sending domain (`fotograph.nl`) under **Domains**
3. The from address in `src/lib/resend.ts` is `noreply@fotograph.nl` — update if your verified domain differs

---

## 5. Remaining UX Issues (to fix before public launch)

### High priority
- **No mobile nav** — nav links are a horizontal row with `gap-8`. On small screens they'll be tight or overflow. Need a hamburger or collapsing nav for < 640px.
- **Dashboard doesn't auto-refresh** — processing jobs show "Bezig" but the page never polls. User has to reload to see their result appear. Add a client-side poller on the dashboard for any in-progress jobs.
- **Upgrade success banner fires on any `?status=success`** — a bookmarked URL always shows the banner. Should verify via server or clear the param after display (currently clears via router.replace would be the fix).

### Medium priority
- **No active-page indicator in nav** — all nav links look the same regardless of which page you're on. Add an underline or weight change for the current route.
- **Scene selector has no visual previews** — users see text labels only ("Marmeren aanrechtblad") with no idea what the scene looks like. Add small generated example thumbnails.
- **Upload result has no dashboard CTA** — when generation completes on the upload page, the result appears but there's no "See all your photos →" link. Add a link to `/dashboard` after `stage === "done"`.
- **Download on dashboard only grabs first preview** — if a job generated multiple previews, only the first is offered for download. Show all, or add a "download all" zip.

### Low priority
- **KVK number missing in landing page footer** — replace placeholder before going live.
- **No terms of service / privacy policy** — required for Dutch e-commerce (AVG/GDPR). Add minimal pages before launch.
- **Login header height inconsistency** — login masthead is `h-16`, app nav is `h-14`. Unify to `h-14`.

---

## 6. How a User Moves Through the App

### First visit (new user)
1. Lands on **`/`** (landing page) → reads Dutch copy, sees pricing
2. Clicks **"Gratis beginnen"** → goes to **`/login`**
3. Enters email → receives magic link email
4. Clicks magic link → auth callback fires → user record created with **10 free credits**
5. Redirected to **`/upload?welcome=1`** → sees black welcome banner: *"Je hebt 10 gratis credits"*
6. Also receives a **Resend welcome email** in their inbox

### Generating a photo (core loop)
1. On **`/upload`**: drags in a product photo (JPG/PNG/WEBP, max 20MB)
2. Selects a scene theme from the list (right column)
3. Photo uploads to R2 via presigned URL
4. Trigger.dev job kicks off: removes background (Photoroom) → generates scene (FLUX Fill)
5. Upload page polls every 2s, progress labels update: *Uploaden → Achtergrond → Genereren*
6. Result appears in the right column with a download button
7. Photo also appears in **`/dashboard`** for future access

### Running out of credits
1. User attempts to generate with 0 credits → `POST /api/jobs` returns 402
2. Toast: *"Geen credits meer. Koop een creditpakket om door te gaan."*
3. Nav credits badge (now a link) takes them to **`/upgrade`**

### Buying credits or upgrading
1. **`/upgrade`** shows three subscription plans + credit pack
2. User clicks plan → `POST /api/mollie/checkout` → redirected to Mollie iDEAL checkout
3. After payment → Mollie calls `POST /api/mollie/webhook` → credits added, tier updated
4. User redirected to **`/upgrade?status=success`** → sees confirmation banner

### Pro/Business batch workflow
1. Nav shows **"Batch"** link for Pro/Business users
2. **`/upload/batch`**: drop up to 25 (Pro) or 100 (Business) images
3. Pick one scene theme for the whole batch
4. Click **"Start batch"** → files process sequentially, per-file status shows in grid
5. Toast when all queued: *"Alle foto's zijn verstuurd — resultaten verschijnen op het dashboard"*
6. **`/dashboard`** shows all results as they complete

### Account management
- **`/account`** shows: current plan, credits left, photos made, subscription expiry
- **"Credits kopen / Upgraden"** button goes to `/upgrade`
- **Uitloggen** signs out and redirects to `/login`
