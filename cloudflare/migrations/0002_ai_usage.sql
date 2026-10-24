-- Non-financial count-only rate limit. No prompts or conversations are persisted.
CREATE TABLE IF NOT EXISTS ai_usage(
  user_id TEXT NOT NULL,
  day TEXT NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id,day)
);
