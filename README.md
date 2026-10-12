# NexaKit
```
nexakit/
├─ index.html              shell, SEO/OG/JSON-LD, Alpine UI
├─ sw.js, manifest.webmanifest   PWA (offline shell, SWR cache; Supabase calls never cached)
├─ js/config.js            keys, payout channels, creator number
├─ js/registry.js          tool registry + family generators (add tools here)
├─ js/app.js               virtual grid, search, auth, offline usage queue, sharing
├─ js/tools/*.js           lazy-loaded heavy tools (qr, pdf, image) via dynamic import
└─ supabase/
   ├─ schema.sql           tables, RLS, ledger, referral trigger, atomic payout fn
   └─ functions/request-withdrawal/   (+ ai-proxy: add rate limit per user/Pro tier)
```
Setup: create Supabase project → run schema.sql → set keys in config.js →
`supabase functions deploy request-withdrawal` → serve over HTTPS (needed for the service worker).
Pro billing: use Stripe Checkout + webhook edge function that sets profiles.is_pro (Supabase has no native payments product).

## v2 additions
- `js/core.js` + `js/tools/*.js`: 665 tools (category modules + generators). Run `node scripts/build-pages.mjs` after adding tools → one SEO landing page per tool + sitemap.xml.
- `supabase/migrations/002_growth.sql`: daily check-in streak, AI quota, seed tasks. `functions/ai-proxy`: Free 5/day, Pro 200/day.
- Deploy: `supabase functions deploy ai-proxy request-withdrawal` and `supabase secrets set ANTHROPIC_API_KEY=...`
