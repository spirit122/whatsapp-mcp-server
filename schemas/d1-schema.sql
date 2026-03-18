-- ─────────────────────────────────────────────
-- D1 Database Schema
-- WhatsApp MCP Server — Logs & Analytics
-- ─────────────────────────────────────────────

-- Incoming messages log (mirror of DO data for analytics queries)
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  from_number TEXT NOT NULL,
  from_name TEXT,
  message_type TEXT NOT NULL,
  content TEXT,
  timestamp INTEGER NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  phone_number_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_number);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);

-- Message status tracking
CREATE TABLE IF NOT EXISTS message_statuses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('sent', 'delivered', 'read', 'failed')),
  recipient TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  conversation_id TEXT,
  pricing_category TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_statuses_message ON message_statuses(message_id);
CREATE INDEX IF NOT EXISTS idx_statuses_status ON message_statuses(status);
CREATE INDEX IF NOT EXISTS idx_statuses_created ON message_statuses(created_at);

-- Tool usage analytics
CREATE TABLE IF NOT EXISTS tool_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK(tier IN ('free', 'pro', 'enterprise')),
  success INTEGER NOT NULL DEFAULT 1,
  duration_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_usage_client ON tool_usage(client_id);
CREATE INDEX IF NOT EXISTS idx_usage_tool ON tool_usage(tool_name);
CREATE INDEX IF NOT EXISTS idx_usage_created ON tool_usage(created_at);

-- API keys for tier-based access
CREATE TABLE IF NOT EXISTS api_keys (
  key_hash TEXT PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK(tier IN ('free', 'pro', 'enterprise')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_keys_client ON api_keys(client_id);
