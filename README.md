# DrFXQuant Mini — Telegram Serverless Foundation

**Status: foundation implementation (not deployed).** This is an independent migration of DrFXQuant v5.2.0, built for **Telegram Mini App + Telegram Serverless**. The original DrFXQuant source is not modified.

## Implemented
- Telegram Serverless command handler: `/start`, `/help`, `/price BTCUSDT`, `/signals`
- Authenticated Mini App endpoints: profile, live spot quote, public signals, per-user watchlist, language selection, capabilities
- Mobile-first Persian/English RTL/LTR dark dashboard, responsive and keyboard-safe
- Real spot quotes (Binance REST) with error/staleness transparency: **never generate synthetic market values**
- Optional Cloudflare Workers TradingView webhook receiver with D1 persistence, replay suppression, Telegram channel relay, scheduled retries
- No VPS, PM2, Express, Socket.IO, mediasoup, coturn, or self-hosted Postgres needed for the foundation

## NOT implemented / NOT safe to enable yet
AI chat (requires secure provider secrets and per-user usage controls), payments/Stars, QNTM wallet and money settlement, MT5 execution, Auto-Trade, full independent messenger, Quantum Chat DNS node, high-frequency WebSockets, live streaming. They are **not** simulated. Source-mapping and migration gates: [docs/MIGRATION-MAP.md](docs/MIGRATION-MAP.md).

## First deployment: Telegram Serverless
Prerequisites: Node.js 18+, a Telegram bot with **Serverless enabled** in BotFather, and the CLI token for that bot (different from the Bot API token).

```bash
npm install
npx tgcloud login
npx tgcloud status
npx tgcloud push
npx tgcloud migrate
npx tgcloud webhook sync
```

**Warning:** On an existing bot, `tgcloud push` mirrors local modules and may remove remote modules not present in this repository. Check status/diff/backup before pushing. In this new project, review the cloud state before the first deploy. The CLI prints the generated Mini App URL (for BotFather → Mini App).

The default UI and bot work without a signal gateway for prices/profile/watchlists; signals explicitly show **not configured**.

## Optional: Cloudflare TradingView signals gateway
```bash
cd cloudflare
npm install
npx wrangler login
npx wrangler d1 create drfxquant-mini-signals
```

Copy the returned UUID into `cloudflare/wrangler.jsonc` at `database_id`, set `SIGNAL_CHANNEL_ID` to your Telegram channel chat ID (bot must be an admin), then:

```bash
npx wrangler secret put TRADINGVIEW_WEBHOOK_SECRET
npx wrangler secret put TELEGRAM_BOT_TOKEN
npm run migrate:remote
npm run deploy
```

Put the deployed Worker **HTTPS URL only** (not any secret) into `tgcloud/lib/config.js` as `GATEWAY_URL`, then review and deploy the Telegram modules again with `npx tgcloud push`. Use this TradingView webhook endpoint:

`POST https://YOUR-WORKER.workers.dev/api/webhooks/tradingview`

Payload example (replace with a secure shared secret, do not commit it):

```json
{"secret":"<WEBHOOK_SECRET>","symbol":"BTCUSDT","side":"buy","timeframe":"15m","price":70000,"stop_loss":69500,"take_profit":71000,"strategy":"Example"}
```

The numbers above are *schema examples*, not real market data or trade recommendations. Signal relay is **at-least-once** in failure modes, not guaranteed exactly once. Do not connect it to automatic order execution.

## Tests
```bash
node tests/static-check.mjs
cd cloudflare && npm test
```

The tests are offline. Live Telegram deployment/authorization, Binance access, TradingView delivery and Cloudflare credentials require separate end-to-end checks after configuration.

## Security notes
- Do **not** commit Bot API tokens, tgcloud credentials, Webhook secrets, API keys, `.env`, private certificates, or the source ZIP.
- Telegram authenticates `endpoints/*` via verified Mini App initData; do not use client `initDataUnsafe` for authorization.
- Public D1 signals and ordinary watchlists are **not** financial account data. Keep the legacy PostgreSQL QNTM ledger out of this prototype.
- This repo is currently public. Only audited and allowlisted files were imported.

Sources: [Telegram Serverless](https://core.telegram.org/bots/serverless), [Telegram Mini Apps](https://core.telegram.org/bots/webapps), [Cloudflare D1](https://developers.cloudflare.com/d1/).

## Optional AI Assistant (Cloudflare Worker, disabled by default)
Set the **same public** Cloudflare Worker URL (no API keys) in `web/config.js` and in `tgcloud/lib/config.js`. Set Worker `ALLOWED_ORIGIN` to the actual hosted Mini App origin, e.g. `https://app<app_id>.tgcloud.ai` (no trailing slash). The `/api/ai` endpoint verifies Telegram Mini App `initData` with the Telegram Bot API token stored only as a Worker secret, enforces max 15-minute freshness, 20 AI requests per Telegram user per UTC day, and never stores prompt text. Configure additional Worker secrets:

```bash
cd cloudflare
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler secret put OPENROUTER_MODEL
npx wrangler d1 migrations apply drfxquant-mini-signals --remote
npm run deploy
```

The AI model must be verified as actually available for the supplied API key. No live model is claimed before these steps. Mini App calls cross-origin Worker with allowed exact `Origin` and verified `initData`; never rely on `initDataUnsafe` for security. Bot text AI replies remain disabled in v0.1.0; this AI module is Mini App only.
