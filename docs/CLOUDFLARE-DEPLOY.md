# Cloudflare deployment (Telegram Serverless approval NOT required)

This repo now has an independent Cloudflare Workers deployment for the existing Mini App foundation.
Web, six locales, Telegram bot commands, authenticated user profile, watchlists, Binance quotes,
public TradingView signals, and optional AI all run on Cloudflare.
Live streaming remains disabled. Legacy QNTM wallet, payment processing, MT5 live execution,
Auto-Trade and independent messenger have **not** been migrated and are **not** represented as functional.

The Cloudflare Worker bundles the static UI into the same origin to remove CORS and extra hosting.
Telegram Mini App \`initData\` is verified with HMAC-SHA256 on every privileged API request,
and 15-minute freshness enforced. Never authenticate with client-side \`initDataUnsafe\`.

## Deployment
Use Node.js 22+. From \`cloudflare/\`:

\`\`\`sh
npm install
npm run build
npm run migrate:remote
npm run deploy
\`\`\`

Configure Cloudflare Worker **secrets** (never commit them):

\`\`\`sh
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_WEBHOOK_SECRET
wrangler secret put TRADINGVIEW_WEBHOOK_SECRET
# Optional AI:
wrangler secret put OPENROUTER_API_KEY
wrangler secret put OPENROUTER_MODEL
\`\`\`

Set the bot webhook to \`https://drfxquant-mini.drfxai.workers.dev/api/bot/webhook\`
using Telegram Bot API \`setWebhook\` with the **same** webhook secret as the Worker.
Register the Mini App URL \`https://drfxquant-mini.drfxai.workers.dev/\` in BotFather's menu button or Mini App settings.
The Worker protects the bot ingress using \`X-Telegram-Bot-Api-Secret-Token\`.
Do not configure an additional active Telegram webhook on another host for the same bot.
Do not share Telegram bot tokens or webhook secrets in a ticket or public issue.

## Public endpoints
- \`GET /\`: Mini App UI
- \`GET /health\`: readiness and which integrations are configured (no credentials)
- \`POST /api/app/{getProfile|getCapabilities|getPrice|getSignals|getWatchlist|saveWatchlist|saveSettings}\`:
  requires \`x-telegram-init-data\` verified for the current user
- \`POST /api/ai\`: optional, authenticated OpenRouter assistant
- \`POST /api/bot/webhook\`: authenticated Telegram bot updates
- \`POST /api/webhooks/tradingview\`: authenticated TradingView alerts
- \`GET /api/signals\`: public nonfinancial signals

Check bot webhook, login, prices, 6 locales, persistence, signals and AI end-to-end after
configuring secrets. Market quotes depend on availability of external Binance public REST.
Never rely on this architecture as a live financial ledger.
