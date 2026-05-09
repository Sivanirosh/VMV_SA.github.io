# AGENTS.md
> Swiss NGO · School building in Sri Lanka · Last updated: 2026-05

## Mission & CTAs
Public website for a Swiss non-lucrative association building schools in rural Sri Lanka.
Priority CTAs: **Donate** → **Volunteer** → **Partner**
Design reference: [pratham.org](https://pratham.org) — warm, human, field-photography-driven.

---

## Stack

| Layer | Tool | HQ |
|---|---|---|
| Framework | Astro 4.x + Tailwind CSS 3.x | — |
| Content | Astro Content Collections (Markdown) | — |
| Payment | Stripe API + Checkout | 🇺🇸 |
| Email (transactional) | Infomaniak Mail API | 🇨🇭 |
| Newsletter | Swiss Newsletter | 🇨🇭 |
| Hosting (prod) | Infomaniak Web Hosting (Node.js) | 🇨🇭 |
| Hosting (proto) | GitHub Pages | — |
| Analytics | Plausible | 🇪🇺 |

**Hard constraints:** no React/Vue, no auth, no external CMS, no DB beyond SQLite (donor log only). Prefer Swiss-hosted services. All secrets in env vars, never in git.

---

## Structure

```
public/fonts/                  # Self-hosted only
public/images/field/           # Real field photos — no stock
public/images/logos/
src/content/                   # MAINTAINER ZONE — .md files only
  config.ts
  projects/
  stories/
src/components/layout/         # Nav, Footer, SEOHead
src/components/home/           # Hero, ImpactCounter, CurrentProject, StoryReel
src/components/shared/         # ProjectCard, StoryCard, DonateButton, SectionHeader
src/components/forms/          # VolunteerForm, PartnerForm
src/layouts/                   # BaseLayout, ProjectLayout, StoryLayout
src/pages/
  index.astro
  about.astro
  projects/[slug].astro
  stories/[slug].astro
  volunteer.astro
  donate.astro
  contact.astro
  404.astro
src/api/                       # Serverless: donate.js, webhook.js, contact.js
src/i18n/en.ts                 # All UI strings — no hardcoded strings in templates
src/styles/global.css
```

---

## Design Tokens

```css
:root {
  --color-primary:      #C45C2E;
  --color-primary-dark: #9E4422;
  --color-bg:           #FDFAF6;
  --color-surface:      #F5EFE6;
  --color-text:         #1A1208;
  --color-text-muted:   #6B5C4A;
  --color-border:       #E2D5C3;
}
```

Fonts: `Playfair Display` (headings) + `Source Sans 3` (body) — self-hosted via `@font-face`.

---

## Content Schemas

**Project** (`src/content/projects/*.md`)
```yaml
---
title: string
status: "planned" | "in-progress" | "completed"
location: string
startDate: YYYY-MM
completedDate: YYYY-MM          # omit if incomplete
coverImage: string
stats:
  studentsServed: number
  classroomsBuilt: number
  volunteersInvolved: number
summary: string                 # one sentence
---
```

**Story** (`src/content/stories/*.md`)
```yaml
---
name: string
age: number
location: string
coverImage: string
quote: string                   # first-person, max 20 words
publishedDate: YYYY-MM
---
```

---

## Page Specs

**Home** — section order: Hero (full-bleed photo + mission + Donate/Learn More CTAs) → ImpactCounter → CurrentProject (`status: in-progress`) → StoryReel (3 latest) → Programs (Build / Educate / Sustain) → Partners strip → Newsletter signup.

**Donate** — custom form (amount tiers + custom, once/monthly toggle, CHF/EUR/USD) → POST to `/api/donate` → Stripe Checkout redirect → `/donate/success` or `/donate/cancel`. Below form: IBAN wire instructions + Twint QR code + tax receipt note + financials PDF link.

---

## Rules

- `src/content/` — never restructure; agents only touch `config.ts`
- `DonateButton` — always routes to `/donate`, never embeds inline elsewhere
- All strings via `src/i18n/en.ts`; mark unextracted strings `// TODO(i18n):`
- Astro `<Image />` for all images
- Props typed on every component
- Mobile-first (375px baseline)
- WCAG AA contrast minimum

---

## Accounts

| Service | Provider | Status |
|---|---|---|
| Domain | — | ✅ owned |
| Repo | GitHub | ✅ |
| Bank | Postfinance 🇨🇭 | ⬜ |
| Payments | Stripe | ⬜ |
| Hosting | Infomaniak 🇨🇭 | ⬜ |
| Email | Infomaniak 🇨🇭 | ⬜ |
| Newsletter | Swiss Newsletter 🇨🇭 | ⬜ |
| Analytics | Plausible | ⬜ |