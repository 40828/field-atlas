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

## Paywall (server-enforced)

- **Free tier:** 15 maps. `POST /api/atlas` counts every new map in a signed, HttpOnly cookie (`fa_state`) and answers `402` once the limit is reached, no matter what the browser claims. The UI shows a blocking overlay after the 15th map and makes the rest of the app `inert`. `localStorage` is only a display cache and is overwritten with the server's answer on every load.
- **Upgrade buttons:** all use `UpgradeLink`, which opens `NEXT_PUBLIC_STRIPE_CHECKOUT_URL` (default `https://stripe.com`) in a new tab.
- **Unlock:** Stripe redirects to `/?pay_success=true&session_id=cs_...`. On load the app calls `POST /api/stripe/verify`; the server asks Stripe whether that Checkout Session is `paid`, then flips the signed cookie to Pro. The counter is cleared, the green banner shows and the URL is cleaned. A bare `?pay_success=true` (no verifiable session) shows a red "couldn't verify" banner instead.

### Environment variables

| Name | Where | Notes |
| --- | --- | --- |
| `ATLAS_COOKIE_SECRET` | server, **required in production** | 16+ random characters; signs the state cookie. Changing it logs everyone out of Pro. |
| `STRIPE_SECRET_KEY` | server, required to unlock | `sk_live_...` (or `sk_test_...`). Never prefix with `NEXT_PUBLIC_`. |
| `STRIPE_PAYMENT_LINK_ID` | server, recommended | `plink_...`; only sessions from this Payment Link are accepted. |
| `NEXT_PUBLIC_STRIPE_CHECKOUT_URL` | public | Your Payment Link URL (the one upgrade buttons open). |

In Stripe, set the Payment Link's **After payment -> Don't show confirmation page -> redirect** URL to:

```
https://your-domain/?pay_success=true&session_id={CHECKOUT_SESSION_ID}
```

For local testing without Stripe keys, `npm run dev` accepts `/?pay_success=true&session_id=cs_test_dev_unlock` (development mode only).

### Known limits

- No accounts: clearing cookies or using a private window resets the free quota, and a buyer who clears cookies loses Pro until they pay again or you add login + a database.
- A successful session id (in the redirect URL) could be shared for up to 48 hours. Storing used session ids in a database (or handling Stripe webhooks) closes this.
