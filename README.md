# VMV SA — Public Website

> Public website for VMV SA, a Swiss non-lucrative association building schools in rural Sri Lanka.
> Hosted on GitHub Pages at [vmv-sa.org](https://vmv-sa.org) (or GitHub Pages subdomain during prototype phase).

## Stack

- **Framework:** Astro 4 + Tailwind CSS 3
- **Content:** Astro Content Collections (Markdown)
- **Hosting:** GitHub Pages (prototype) → Infomaniak static hosting (production)

## Ecosystem

The donor management, receipt automation, and operations CMS live in a separate repository:

**[Sivanirosh/open-damier](https://github.com/Sivanirosh/open-damier)** — open-source self-hosted donor and operations CMS for small Swiss NGOs.

This public site consumes the CMS's public read API (`GET /api/public/*`) for live campaign data. All donation flows route to the CMS.

## Development

```bash
npm install
npm run dev
```

## Deployment

Deployed automatically via GitHub Actions on push to `main`. See `.github/workflows/deploy.yml`.

See `Lessons-learned.md` for known gotchas with GitHub Pages sub-path deployment.
