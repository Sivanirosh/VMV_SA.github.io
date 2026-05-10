# Lessons Learned

## 1. GitHub Pages sub-path deployment
**Problem:** Repo is `Sivanirosh/VMV_SA.github.io` (not `Sivanirosh.github.io`), so the site deploys at `/VMV_SA.github.io/`, not `/`.
**Fix:** Set `base: '/VMV_SA.github.io'` and `site: 'https://sivanirosh.github.io'` in `astro.config.mjs`.
**Remove when:** moving to custom domain or org account.

## 2. Hardcoded internal paths break with a base
**Problem:** All `href="/about"` and `src="/images/..."` ignored the base path — CSS, images, and navigation 404'd.
**Fix:** `src/utils/url.ts` — a `url()` helper that prepends `import.meta.env.BASE_URL`. Applied to every internal link and image path.

## 3. GitHub Pages not enabled
**Problem:** First deploy failed with 404 — GitHub Pages was never activated on the repo.
**Fix:** `gh api --method POST repos/.../pages -f build_type=workflow` — activatable via CLI, no UI needed.

## 4. Outdated GitHub Actions (Node.js 20 deprecation)
**Problem:** `actions/checkout@v4`, `setup-node@v4`, `upload-pages-artifact@v3`, `deploy-pages@v4` all run on Node.js 20, which is deprecated June 2026.
**Fix:** Upgrade to `@v5` / `@v6` versions that run natively on Node.js 24. Do not use `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` — that is a workaround, not a fix.

## 5. Git remote was HTTPS, not SSH
**Problem:** First push failed — HTTPS requires credentials not available in the environment.
**Fix:** `git remote set-url origin git@github.com:...` — switch to SSH once and it persists.
