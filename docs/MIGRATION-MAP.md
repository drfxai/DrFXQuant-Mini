# DrFXQuant → Mini: migration map

Analyzed upload: `DrFXQuant-main.zip` (483 entries, 8,066,006 uncompressed bytes), SHA-256 `83269c5f141c9688c936859a98eb8c10caeaf59087b987726477f8df1817f46c`.

Original: `drfxai/DrFXQuant`, version `5.2.0` in `package.json`. The original app remains untouched.

| Original file / module | SHA-256 prefix | New component | Scope |
|---|---|---|---|
| `server.js` | `7937a1f83b644a08` | `tgcloud/handlers/message.js`, endpoints | Replaced Express/Socket.IO entry with on-demand handlers |
| `routes/webhooks.js` | `b489036fa24bda97` | `cloudflare/src/index.js` | Webhook validation, dedupe, D1 persistence, channel relay (subset) |
| `services/price-binance.js` | `6aa129326b7b78fb` | `tgcloud/lib/market.js` | Public Binance ticker with failure-closed behavior |
| `services/signal-report-scheduler.js` | `6f9ce350b04774c3` | Planned Cron tasks | Not yet migrated |
| `public/index.html` | `a39dd97dc96eeed3` | `web/index.html`, `web/app.js`, `web/style.css` | Reimplemented mobile UI, not a 1:1 copy |
| `qntm-ledger/integrate.js` | `4f467fe0de2c39e2` | Deferred dedicated financial service | NOT migrated; preserving transactional semantics required |
| `realtime/sfu.js` | `f1a158a9344b9fec` | Excluded | Live streaming deliberately OFF |
| `package.json` | `ae6ec04d3c6f4771` | New platform-specific manifests | Legacy Node packages cannot run in tgcloud V8 |

## Reviewed categories and decisions
1. **Reusable idea / behavior:** TradingView signal fields (`symbol`, `side`, `price`, `stop_loss`, `take_profit`, `timeframe`); public prices, per-user preferences, user-friendly dark trading UI.
2. **Requires redesign:** Native Telegram group messaging vs original private messenger; auth; subscriptions; admins; chat file storage, AI usage and model selection, notification policies, scheduled signal analytics.
3. **Needs separate stateful execution:** MT5 terminal, tick-level WebSocket market data, continuous polling, protected admin operations, independent encrypted DNS messenger.
4. **Disabled by decision:** Live WebRTC, mediasoup, coturn, TURN, high-FPS screen sharing.
5. **Financial modules:** Quant Option, QNTM Ledger, payments, rewards and Auto-Trade must NOT be copied without accounting reconciliation, risk review and transactional database design.
6. **TradingView Pine sources:** `GODMODE-v*.pine` are chart-platform source code, not executable inside Telegram Serverless; original code retained in original project only.

## Source ZIP handling and exclusions
The archive contained private-key-shaped files at paths under:
- `Hyperion_Ai/.../config/certs/quantor.key`
- `Mark-L-main/.../config/certs/jarvis.key`

Their contents have **not** been copied to this public repository. Treat them as potentially sensitive signing material; assess whether certificate rotation/revocation is warranted. Likewise, nested ZIPs, runtime files, credentials, database exports and legacy payment integrations were not imported.

## Follow-up acceptance criteria
- Validate Telegram BotFather Serverless permission and fresh bot identity.
- Deploy Telegram modules & explicitly review/apply schema migration.
- Test Mini App authenticated calls with actual Telegram initData.
- Deploy D1 gateway, test webhook real deliveries/retry behavior.
- Add observability, abuse/rate-limit controls, privacy/deletion flows, and backups.
- Only then scope additional financial or AI functionality.
