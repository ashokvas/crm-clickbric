# LeadSync CRM

CRM for Clickbric Properties (real estate) and Ashok's AI business.
Live at: https://crm.clickbric.com

## Stack

- **Framework:** Next.js 16 (App Router)
- **Auth:** Clerk v7
- **Database:** Convex (real-time, serverless)
- **Deployment:** Coolify on Contabo VPS, auto-deploy from GitHub (`ashokvas/crm-clickbric`)

---

## Build Status

### Done

- [x] **Phase 1 -- Foundation**
  - Clerk auth (sign in / sign up / sign out)
  - Convex schema: leads, interactions, emailLogs tables
  - Lead dashboard with filters (business type, status, follow-up date)
  - Add lead form (manual entry, mobile-friendly)
  - Lead detail page -- view, edit, delete
  - Interaction timeline -- log calls/meetings, auto-updates next follow-up date
  - Mobile responsive (table on desktop, cards on mobile)

- [x] **Phase 2 -- Lead capture webhooks**
  - `POST /api/webhooks/housing` -- Housing.com lead capture
  - `POST /api/webhooks/google-ads` -- Google Ads Lead Form Extensions
  - Webhook secret validation via `?secret=` query param

- [x] **Phase 3 -- WhatsApp quick-send (replaced bulk email)**
  - `app/lib/whatsapp.ts` -- generates wa.me click-to-chat URLs with pre-written messages
  - "Follow-ups due" panel at top of dashboard (overdue + today's leads)
  - WhatsApp button on dashboard table rows (desktop) and cards (mobile)
  - WhatsApp button on lead detail page
  - Messages auto-generated based on lead status

- [x] **Phase 4 -- Deployment**
  - Live at crm.clickbric.com
  - Auto-deploy via GitHub Action → Coolify API

---

### To Do

- [ ] **Lead import** -- CSV upload to bulk-import leads, column mapping, deduplication by phone

---

### Done (detailed)

- [x] Phase 1 -- Foundation (auth, leads, dashboard, mobile responsive)
- [x] Phase 2 -- Webhooks (Housing.com push endpoint, Google Ads)
- [x] Phase 3 -- WhatsApp quick-send + AI-suggested messages via Claude
- [x] Phase 4 -- Deployment on Coolify + auto-deploy via GitHub Actions
- [x] Search -- filter leads by name, phone, email, requirement
- [x] Edit interactions -- inline edit form on each interaction card
- [x] Lead notes -- inline editable on lead detail page
- [x] Housing.com auto-sync -- Convex cron every 15 min, HMAC auth, deduplication

---

### Future / Backlog

- Push notifications -- daily digest of leads due today (PWA push or WhatsApp to Ashok)
- Bulk WhatsApp outreach -- generate messages for a filtered list, open them one by one
- Property listing attachment -- attach a PDF brochure or link to a lead's WhatsApp message
- Lead scoring -- auto-score leads based on budget, requirement match, engagement
- Convex production upgrade -- currently on dev instance; move to prod before scaling

---

## Local Dev

```bash
# Terminal 1 -- Convex dev server
npx convex dev

# Terminal 2 -- Next.js dev server
npm run dev
```

App runs at http://localhost:3000

## Environment Variables

See `.env.local` (not committed). Required keys:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL=/sign-in
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
HOUSING_WEBHOOK_SECRET=
GOOGLE_ADS_WEBHOOK_SECRET=
```
