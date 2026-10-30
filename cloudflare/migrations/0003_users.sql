-- Cloudflare-native user preferences; no financial/ledger data stored here.
CREATE TABLE IF NOT EXISTS user_settings (
 user_id TEXT PRIMARY KEY,
 language TEXT NOT NULL DEFAULT 'en' CHECK(language IN ('en','fa','ar','tr','ru','hi'))
);
CREATE TABLE IF NOT EXISTS watchlists (
 user_id TEXT PRIMARY KEY,
 symbols TEXT NOT NULL DEFAULT '[]'
);
