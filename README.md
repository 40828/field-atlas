# Field Atlas

Name any field and get its complete map: hierarchy, concept nodes, equations, open problems, learning order and vocabulary, with a book-style reader and animated illustrations.

Next.js (App Router) · TypeScript · Tailwind CSS 4.

```bash
npm install
npm run dev   # http://localhost:3000
```

## Layout

| Path | Purpose |
| --- | --- |
| `app/layout.tsx` | Root layout. Mounts `AtlasProvider` (global `?pay_success=true` unlock check), success banner and paywall. |
| `app/page.tsx` | Renders the dashboard. |
| `app/api/atlas/route.ts` | `POST /api/atlas`: validated requests -> map engine. |
| `lib/atlas/engine.ts` | Server-side generation engine. Swap this for an LLM provider. |
| `lib/atlas/scenes.ts` | Animated SVG scene library. |
| `lib/usage-store.ts` | localStorage-backed free-tier counter / Pro flag (`useSyncExternalStore`). |
| `lib/constants.ts` | `FREE_MAP_LIMIT` (15), Stripe URL, storage keys. |
| `components/dashboard/*` | Sidebar, top bar, map view, term sheet, reader. |
| `components/paywall/*` | Paywall modal, success banner, shared `UpgradeLink`. |

## Paywall

- Free users get 15 maps. The 15th map renders, then a blocking overlay appears; the rest of the app becomes `inert`.
- Every upgrade button is `UpgradeLink`, which opens `STRIPE_CHECKOUT_URL` in a new tab. Set `NEXT_PUBLIC_STRIPE_CHECKOUT_URL` to use a specific Stripe Payment Link (defaults to `https://stripe.com`).
- Configure the Payment Link's success URL as `https://your-domain/?pay_success=true`. On load the app sets Pro, clears the counter, shows the green banner and removes the parameter from the URL.

> The limit and unlock are client-side (`localStorage` + a URL flag), so a motivated user can bypass them. For real enforcement, verify payments server-side (Stripe webhook / Checkout Session lookup) and store entitlement against an account.
