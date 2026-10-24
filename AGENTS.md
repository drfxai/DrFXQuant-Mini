# DrFXQuant Mini agent rules

- Main branch is review-only; make migration changes on a feature branch and open a PR.
- Target: Telegram Serverless v0.2 modules (tgcloud/), static Mini App (web/) and optional external Cloudflare Worker (cloudflare/).
- Do not add `express`, `socket.io`, `pg`, `mediasoup`, `coturn`, native modules or npm imports to `tgcloud/`.
- Only `sdk`, `sdk/db`, `sdk/fetch`, `sdk/api`, and local relative `.js` imports are allowed at tgcloud runtime.
- No raw source ZIPs, local secrets, private certificates or production payment config in the public repo.
- Market prices must be real and timestamped or explicitly unavailable. No fabricated live data.
- Live trading/MT5/financial ledger/AI are not enabled in this foundation; never state otherwise.
- `tgcloud push` can delete remote modules not in project. Require review and explicit publish authorization.
- Prefer feature flags and fail-closed behavior over unsupported placeholders.
