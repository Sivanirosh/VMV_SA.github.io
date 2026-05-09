This document is an early draft that plan the tasks. This is not a final roadmap to follow, rather some guideline that need to be shaped into a final form.

---

# ROADMAP.md (at a later stage)
# Project Roadmap — Association Website
> Education NGO · School Building · Sri Lanka
> Last updated: 2026-05

---

## Status Legend

| Symbol | Meaning |
|---|---|
| ✅ | Done |
| 🔄 | In progress |
| ⬜ | Not started |
| 🔒 | Blocked (dependency noted) |
| ⚠️ | Requires decision |

---

## Phase 0 — Legal & Organizational Foundation
> **Goal:** Exist legally and be able to receive money.
> **Owner:** Association founders
> **Dependency for:** All donation infrastructure, grant applications, donor trust

| Task | Status | Notes |
|---|---|---|
| Draft association statutes (bylaws) | ⬜ | Template available — needs president, treasurer, purpose clause |
| Hold founding meeting (min. 2 people) | ⬜ | Sign and date the statutes |
| Register at commercial registry (RC) | ⬜ | Optional for small associations, but required for legal personality and ZEWO |
| Open Postfinance account in association name | ⬜ | Requires statutes + founding minutes |
| Obtain association IBAN | ⬜ | Published on the Donate page |
| Define governance: who can authorize expenses | ⬜ | Minimum: president + treasurer dual signature above CHF 500 |
| Draft a one-page financial transparency template | ⬜ | Annual income, expenses by category, surplus |

**Milestone 0 complete when:** Association has statutes, bank account, and IBAN. ✦

---

## Phase 1 — Content Foundation
> **Goal:** Have real content before building a single page.
> **Owner:** Association (not the agent)
> **Dependency for:** Every page on the site

| Task | Status | Notes |
|---|---|---|
| Write 2-sentence mission statement | ⬜ | What you do, where, for whom — no jargon |
| Write origin story (5–8 sentences) | ⬜ | Who started it, why, the triggering moment |
| Compile impact numbers | ⬜ | Schools built, children reached, volunteers involved — even if small |
| Select 10–15 field photos for web use | ⬜ | Must be high-res, people photographed must have consented |
| Write 2–3 impact stories (named individuals) | ⬜ | See story schema in AGENTS.md — real names, specific details |
| Write current project description | ⬜ | Which school, where, what stage, what remains |
| Collect team bios (2–3 sentences each) | ⬜ | With photos if available |
| Confirm logo files exist in SVG + PNG | ✅ | |

**Milestone 1 complete when:** All 8 content items above are drafted (even rough). ✦

---

## Phase 2 — GitHub Pages Prototype
> **Goal:** A working, browsable site deployed at `<org>.github.io/<repo>`.
> **Owner:** Developer (coding agent)
> **Stack:** Astro 4 + Tailwind CSS + Netlify Forms

### 2.1 — Project Scaffold

| Task | Status | Notes |
|---|---|---|
| Initialize Astro project with Tailwind | ⬜ | `npm create astro@latest` |
| Configure GitHub Pages deploy action | ⬜ | See AGENTS.md deployment section |
| Set up `src/i18n/en.ts` string file | ⬜ | English only at this stage |
| Define Content Collection schemas | ⬜ | `projects` and `stories` schemas in `config.ts` |
| Set up global CSS with design tokens | ⬜ | Color palette, font imports, base reset |
| Create `BaseLayout.astro` with Nav + Footer | ⬜ | |

### 2.2 — Core Pages

| Task | Status | Notes |
|---|---|---|
| Home (`index.astro`) | ⬜ | Hero, ImpactCounter, CurrentProject, StoryReel, Newsletter |
| About (`about.astro`) | ⬜ | Mission, origin story, team cards, financials PDF link |
| Projects index (`projects/index.astro`) | ⬜ | Grid of all ProjectCards |
| Project detail (`projects/[slug].astro`) | ⬜ | Dynamic from content collection |
| Stories index (`stories/index.astro`) | ⬜ | Grid of StoryCards |
| Story detail (`stories/[slug].astro`) | ⬜ | Dynamic from content collection |
| Volunteer (`volunteer.astro`) | ⬜ | Info + Netlify Form |
| Donate (`donate.astro`) | ⬜ | Placeholder embed + IBAN block |
| Contact (`contact.astro`) | ⬜ | Partner/press Netlify Form |
| 404 (`404.astro`) | ⬜ | On-brand, links back to Home |

### 2.3 — Content Population

| Task | Status | Notes |
|---|---|---|
| Create 1 sample project `.md` file | ⬜ | Use real content from Phase 1 |
| Create 2 sample story `.md` files | ⬜ | Use real content from Phase 1 |
| Add field photos to `public/images/field/` | ⬜ | Compressed to ≤300KB per image |
| Add logo to `public/images/logos/` | ⬜ | SVG preferred |

**Milestone 2 complete when:** All pages render at `<org>.github.io`, forms submit correctly, no broken images or links. ✦

---

## Phase 3 — Donation Infrastructure
> **Goal:** Money can flow from a donor's browser to the association's bank account via a fully self-owned stack.
> **Dependency:** Phase 0 (bank account must exist)
> **Architecture principle:** No donation platform dependency. We own the form, the data, and the flow. Stripe is used as a payment processor only — pure infrastructure, not a platform. Infomaniak handles serverless endpoints and transactional email. A custom CMS/admin tool for donor management is scoped in Phase 5.

### 3.1 — Payment Processor Setup

| Task | Status | Notes |
|---|---|---|
| Create Stripe account for the association | ⬜ | stripe.com — requires legal identity + bank account |
| Activate CHF (primary) + EUR + USD | ⬜ | Multi-currency enabled in Stripe dashboard |
| Enable Stripe recurring payments (subscriptions) | ⬜ | For monthly donor tier |
| Connect Stripe payouts to Postfinance IBAN | ⬜ | Stripe supports CHF payouts to Swiss accounts |
| Store Stripe secret key as environment variable on Infomaniak | ⬜ | Never committed to git |

### 3.2 — Custom Donation Form

| Task | Status | Notes |
|---|---|---|
| Build `/donate` page with custom HTML form | ⬜ | Amount selector (CHF 20 / 50 / 100 / custom), frequency toggle (once / monthly), currency selector |
| Build `/api/donate` serverless endpoint on Infomaniak | ⬜ | Validates input → calls Stripe API → creates Checkout Session → returns redirect URL |
| Build `/donate/success` and `/donate/cancel` pages | ⬜ | Post-payment landing pages — clear messaging, no ambiguity |
| Implement `/api/webhook` endpoint (Infomaniak serverless) | ⬜ | Listens for Stripe `checkout.session.completed` — source of truth for all confirmed donations |
| Add IBAN wire transfer instructions | ⬜ | Include payment reference format (donor name + year) for manual reconciliation |
| Display Twint QR code on donate page | ⬜ | Generated via Postfinance — static QR, high conversion for Swiss mobile donors |

### 3.3 — Transactional Email via Infomaniak 🇨🇭

| Task | Status | Notes |
|---|---|---|
| Configure Infomaniak Mail API for transactional sends | ⬜ | Triggered by `/api/webhook` on confirmed donation |
| Draft donor acknowledgement email template | ⬜ | Sent on every confirmed payment: amount, date, association name, RC number |
| Draft tax receipt email template | ⬜ | Required for Swiss donors declaring deductions — triggers for donations ≥ CHF 100 |
| Draft tax receipt PDF template | ⬜ | Generated server-side on request — association letterhead, all legally required fields |
| Set up internal notification email | ⬜ | Alert treasurer on each confirmed donation (amount, donor email, reference) |

### 3.4 — Donor Data Log

| Task | Status | Notes |
|---|---|---|
| Log each confirmed donation to SQLite on Infomaniak | ⬜ | Schema: amount, currency, date, Stripe session ID, donor email, frequency — seed data for Phase 5 CMS |
| Document the schema in `/docs/donor-schema.md` | ⬜ | Ensures Phase 5 CMS is built against the real data structure |

### 3.5 — Testing

| Task | Status | Notes |
|---|---|---|
| End-to-end test in Stripe test mode | ⬜ | Use Stripe test card `4242 4242 4242 4242` |
| Test webhook delivery and email trigger | ⬜ | Use Stripe CLI for local webhook forwarding |
| Test recurring donation creation and cancellation | ⬜ | |
| Make a real CHF 1 live donation | ⬜ | Confirm funds reach the Postfinance account |

> **Note — Custom CMS for donor management:** The SQLite donor log in Phase 3.4 is intentionally minimal. A proper admin interface (donor list, receipt generation, campaign tracking) is scoped as a dedicated deliverable in **Phase 5**. Do not build admin UI here — log cleanly and move on.

**Milestone 3 complete when:** A real CHF donation via card reaches the Postfinance account, a receipt email is sent from an Infomaniak address, and donor data is logged in a self-owned SQLite file on Swiss infrastructure. ✦

---

## Phase 4 — Production Launch
> **Goal:** Live at the real domain, indexed by search engines, ready for donors.
> **Dependency:** Milestones 0, 1, 2, 3

| Task | Status | Notes |
|---|---|---|
| Connect domain DNS to Infomaniak | ✅ | Domain already owned — update nameservers to Infomaniak |
| Enable HTTPS via Infomaniak (auto Let's Encrypt) | ⬜ | |
| Remove GitHub Pages base path from Astro config | ⬜ | Remove `base` option, set `output: 'hybrid'` for API routes |
| Verify serverless API routes work on Infomaniak | ⬜ | `/api/donate`, `/api/webhook`, `/api/contact` |
| Set up Plausible analytics | ⬜ | Add script tag to `SEOHead.astro` |
| Write `robots.txt` and `sitemap.xml` | ⬜ | Astro sitemap integration handles this |
| SEO audit: all pages have unique `<title>` and `<meta description>` | ⬜ | |
| Accessibility audit (WCAG AA) | ⬜ | Keyboard nav, contrast, alt text |
| Mobile audit at 375px on real device | ⬜ | Not just browser devtools |
| Performance audit (Lighthouse ≥ 90 all categories) | ⬜ | |
| Create maintainer handoff guide (2-page PDF) | ⬜ | Screenshots: how to add a project, add a story, update a number |
| Publish first financial transparency page | ⬜ | Even if CHF 0 — establishes the habit |
| Announce on WhatsApp group | ✅ | Already have group |
| Submit to Google Search Console | ⬜ | |

**Milestone 4 complete when:** Site is live at real domain, one real donation has been received, maintainer can update content without developer help. ✦

---

## Phase 5 — Growth & Trust
> **Goal:** Build credibility for larger donors and grant applications.
> **Timeline:** 3–9 months post-launch

| Task | Status | Notes |
|---|---|---|
| Publish annual financial report (PDF) | ⬜ | Year 1 — even if partial |
| Apply for ZEWO certification | ⬜ | Requires 2+ years of documented activity, look at  Swiss GAAP RPC 21 and https://zewo.ch/wp-content/uploads/2023/03/QR-Swiss-GAAP-FER-21.pdf |
| Add a dedicated "Press" section | ⬜ | Logos of media coverage, contact for press |
| Add supporter/partner logo strip | ⬜ | Even 2–3 logos signals legitimacy |
| Begin grant research | ⬜ | SDC, Canton de Berne, Migros Cultural Percentage |
| Produce a 2-minute project video | ⬜ | Shot in the field — embed on Home and Projects |
| Add social proof: volunteer testimonials | ⬜ | 2–3 quotes with photos from people who went to Sri Lanka |
| Set up a recurring donor program | ⬜ | "Become a School Friend" — CHF 20/month tier |
| Monthly newsletter infrastructure | ⬜ | Mailchimp or Brevo (free tier) — collect emails from launch day |

**Milestone 5 complete when:** Association has ZEWO certification or is in process, has at least one institutional funder, and the site documents ≥ 1 year of activity. ✦

---

## Phase 6 — Multilingual (Tamil + Sinhala)
> **Goal:** Serve the Sri Lankan community and partners in their languages.
> **Dependency:** Phase 4 complete, i18n architecture in place (built in Phase 2)

| Task | Status | Notes |
|---|---|---|
| Identify Tamil translator (community volunteer preferred) | ⬜ | Do not use machine translation for impact stories |
| Activate Astro i18n routing for `/ta/` routes | ⬜ | Architecture already prepared in Phase 2 |
| Translate all strings in `src/i18n/en.ts` → `ta.ts` | ⬜ | |
| Translate 3 core pages: Home, About, Donate | ⬜ | Priority pages for the local community |
| Add language switcher to Nav | ⬜ | EN / தமிழ் |
| QA with a native Tamil speaker | ⬜ | Not optional |
| Assess Sinhala addition | ⬜ | Depends on audience feedback |

---

## Dependencies Map

```
Phase 0 (Legal)
    └── Phase 3 (Donations) ──────────────────┐
                                               │
Phase 1 (Content)                              │
    └── Phase 2 (Prototype)                    │
            └── Phase 4 (Launch) ◄─────────────┘
                    └── Phase 5 (Growth)
                            └── Phase 6 (Multilingual)
```

Phases 0 and 1 can run fully in parallel. Phase 2 (prototype) can start before Phase 1 is complete — build with placeholder content, replace with real content before Milestone 4.

---

## Open Decisions

These require an explicit choice before the relevant phase begins:

| Decision | Options | Phase needed by |
|---|---|---|
| Association name (final) | ⚠️ TBD | Phase 0 |
| Primary accent color | Terracotta `#C45C2E` (default) or other | Phase 2 |
| Donation tiers | CHF 20 / 50 / 100 / custom — or open amount only | Phase 3 |
| Newsletter tool | **Swiss Newsletter** (free ≤200/month) vs **Mailpro** (Swiss, paid) | Phase 4 |
| Video hosting | YouTube (reach) vs Vimeo (clean embed, no ads) | Phase 5 |
| Sinhala support | Yes / No / Later | Phase 6 |

---
