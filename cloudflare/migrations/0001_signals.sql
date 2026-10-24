-- Public signals only. NOT a financial ledger or a trade execution database.
CREATE TABLE IF NOT EXISTS signals (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK(side IN ('buy','sell','close','alert')),
  timeframe TEXT NOT NULL,
  price REAL,
  stop_loss REAL,
  take_profit REAL,
  strategy TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  delivered_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_pending ON signals(delivered_at,lease_until,created_at);
