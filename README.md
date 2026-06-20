# DJ M3DI — djm3di.com

High-tech dark website for DJ M3DI. Astro + Tailwind CSS, deployed on Cloudflare Pages with a Pages Function for the booking form (WhatsApp delivery via Twilio).

---

## Local Development

```bash
npm install
npm run dev        # http://localhost:4321
```

For the booking form to work locally, create `.dev.vars` (gitignored):

```bash
cp .env.example .dev.vars
```

Then fill in the values (see **Environment Variables** below). Cloudflare Pages Functions run automatically at `/booking` when using `wrangler pages dev`:

```bash
npx wrangler pages dev dist --compatibility-date=2024-09-25
```

Or run `npm run build` first, then `wrangler pages dev dist`.

---

## Build & Deploy

```bash
npm run build      # outputs to dist/
```

**Cloudflare Pages settings:**
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js version: 20 (set in Environment Variables → `NODE_VERSION=20`)

---

## Environment Variables

Set these in **Cloudflare Pages → Settings → Environment Variables**.

| Variable | Type | Description |
|---|---|---|
| `PUBLIC_TURNSTILE_SITE_KEY` | Plain text | Turnstile widget site key (public — also set in Build variables) |
| `TURNSTILE_SECRET_KEY` | Secret | Turnstile secret key |
| `TWILIO_ACCOUNT_SID` | Secret | Twilio Account SID (starts with `AC`) |
| `TWILIO_AUTH_TOKEN` | Secret | Twilio Auth Token |
| `TWILIO_WHATSAPP_FROM` | Plain text | WhatsApp sender — `whatsapp:+14155238886` (sandbox) or your approved sender |
| `TWILIO_WHATSAPP_TEMPLATE_SID` | Plain text | (Optional) Approved template SID for production sends — `HXxxxx` |
| `BOOKING_WHATSAPP_TO` | Plain text | Recipient — `whatsapp:+17474440033` |

> `PUBLIC_TURNSTILE_SITE_KEY` must be set in **both** Build-time vars (for Astro to inline it) and Runtime vars (Pages Functions access it via `env` too, but the widget needs it at build time).

---

## How the Booking Form Works

1. Visitor fills out the multi-section booking inquiry form at `/#bookings`.
2. Cloudflare Turnstile widget verifies the submission is human.
3. On submit, the browser POSTs JSON to `/booking`.
4. The Cloudflare Pages Function at `functions/booking.ts`:
   - Verifies the Turnstile token server-side.
   - Validates all required fields.
   - Checks a server-side rate limit (3 requests / 15 min per IP).
   - Formats all fields into a labelled WhatsApp message.
   - POSTs to the Twilio Messages API (HTTP Basic auth, server-side only — credentials never leave the Function).
5. The WhatsApp message is delivered to `+17474440033`.

### Twilio Constraints

**Before go-live you must:**

1. **Create a Twilio account** at twilio.com and note your Account SID + Auth Token.

2. **WhatsApp Sandbox (testing):**
   - In Twilio Console → Messaging → Try it out → Send a WhatsApp Message.
   - The number `+17474440033` must send the join code once (e.g. `join <word-word>`) to the sandbox number (`+14155238886`).
   - After joining, freeform messages work for 24 hours after the last inbound message.
   - `TWILIO_WHATSAPP_FROM=whatsapp:+14155238886`

3. **Production (approved sender):**
   - Apply for a WhatsApp Business sender in Twilio Console → Messaging → Senders → WhatsApp Senders.
   - Outside the 24-hour session window, WhatsApp only allows **pre-approved message templates**.
   - Create and submit a booking notification template in Twilio Console.
   - Once approved, set `TWILIO_WHATSAPP_TEMPLATE_SID=HXxxxx`.
   - The function currently sends freeform messages. To use an approved template instead, update `sendWhatsApp()` in `functions/booking.ts` to use `ContentSid` + `ContentVariables` instead of `Body`.

---

## DNS Configuration (djm3di.com)

Point your domain at Cloudflare Pages by adding these DNS records in your domain registrar **or** in Cloudflare DNS (if the domain is already on Cloudflare):

| Type | Name | Value | Proxy |
|---|---|---|---|
| `CNAME` | `www` | `djm3di.pages.dev` | Proxied (orange cloud) |

**Apex → www redirect** — after adding the custom domain in Cloudflare Pages:
1. Cloudflare Pages → djm3di project → Custom domains → Add `www.djm3di.com`
2. In Cloudflare Dashboard → djm3di.com → Rules → Redirect Rules → Create:
   - Incoming URL: `djm3di.com/*` (hostname is `djm3di.com`)
   - Redirect to: `https://www.djm3di.com/$1` (301 permanent)

If `djm3di.com` is not yet on Cloudflare, update your registrar's nameservers to Cloudflare's (provided when you add the site in Cloudflare Dashboard), then add the CNAME above.

---

## Adding a New Mix

Open `src/data/mixes.json` and add one line to the array:

```json
{ "id": 34, "title": "Your New Mix Title", "url": "https://soundcloud.com/deejaymedi/your-mix-slug" }
```

Rebuild and deploy. The card appears automatically.

---

## SoundCloud Downloads

Download availability per track is controlled in your SoundCloud account:

1. Log into soundcloud.com → Profile → Your tracks.
2. Open the track → Edit → Permissions.
3. Enable "Enable downloads" per track.

The Download button on each card links to the SoundCloud track URL where visitors can use SoundCloud's own download button when enabled.

---

## OG / Social Share Image

The `og-image.png` at `public/og-image.png` does **not** exist yet — you need to create it.
Recommended size: **1200 × 630 px**. Content suggestion: DJ M3DI wordmark in Chakra Petch on the void black background (`#070708`) with the electric cyan accent (`#00E5FF`). Export as PNG and place at `public/og-image.png`, then redeploy.

---

## Turnstile Setup

1. Log into Cloudflare Dashboard → Turnstile → Add widget.
2. Name: `djm3di-booking`; Domain: `www.djm3di.com` + `localhost`.
3. Mode: **Managed**.
4. Copy the **Site Key** → set as `PUBLIC_TURNSTILE_SITE_KEY` (Build + Runtime env var in Pages).
5. Copy the **Secret Key** → set as `TURNSTILE_SECRET_KEY` (Secret in Pages).

---

## Owner Action Checklist

Things that require your credentials / manual steps:

- [ ] **Cloudflare account** — log in, connect the `djm3di` GitHub repo to Cloudflare Pages (or run `npx wrangler pages deploy dist --project-name=djm3di`)
- [ ] **Custom domain** — add `www.djm3di.com` in Pages → Custom domains; configure apex redirect (see DNS section above)
- [ ] **Turnstile** — create widget, copy site key + secret key, set env vars
- [ ] **Twilio** — create account, get SID + Auth Token, set env vars
- [ ] **WhatsApp sandbox** — send join code from `+17474440033` to Twilio sandbox number (testing)
- [ ] **WhatsApp Business sender** — apply and get approved for production sends
- [ ] **OG image** — create `public/og-image.png` (1200×630) and redeploy
- [ ] **SoundCloud downloads** — enable per-track downloads in SoundCloud account settings
- [ ] **Social links** — update `#` hrefs in `src/components/Footer.astro` with real Instagram, Spotify, Beatport, YouTube, Mixcloud URLs once available
