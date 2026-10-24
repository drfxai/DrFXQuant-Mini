# AI gateway threat model

- Auth: server-side HMAC-SHA-256 of canonical Telegram `initData`, derived from `TELEGRAM_BOT_TOKEN` Worker secret, with 15-minute TTL. Client `initDataUnsafe` does not authorize anything.
- Origin: `ALLOWED_ORIGIN` **must** equal the fully qualified actual Telegram Mini App origin. No wildcard CORS. Origin is an additional browser boundary, not a replacement for cryptographic authentication.
- Abuse: atomic per-user/day D1 counter, 20 requests/UTC day, prompt 1–1800 chars, bounded output tokens; rate limiting also needed per IP and upstream provider budget.
- Content: generic education, no trade execution, no claimed live market data.
- Privacy: prompts are sent directly to configured OpenRouter provider, no chat history retained by this app. Check provider retention policies before release. Telegram IDs are stored for daily quotas.
- AI remains OFF until Worker, D1, OpenRouter key and verified model are configured and tested. User-facing errors are generic and no credentials are returned.
- Known follow-ups: sensitive content moderation, spend caps, deletion policy, adversarial testing, false-origin handling, per-user request-id deduplication and rollback controls.
