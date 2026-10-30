CREATE TABLE IF NOT EXISTS bot_setup_status (
 id INTEGER PRIMARY KEY CHECK (id = 1),
 status TEXT NOT NULL DEFAULT 'pending',
 last_attempt INTEGER NOT NULL DEFAULT 0,
 last_ready INTEGER,
 last_error TEXT NOT NULL DEFAULT '',
 bot_username TEXT NOT NULL DEFAULT ''
);
