-- User Brain Schema Migration
-- Tracks user behavior patterns and 3D cognitive graph

-- User actions log (immutable event stream)
CREATE TABLE IF NOT EXISTS user_actions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'message_sent', 'tool_used', 'computer_action', etc.
  channel TEXT,
  content JSONB NOT NULL,
  duration INTEGER, -- milliseconds
  success BOOLEAN,
  timestamp TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS user_actions_user_idx ON user_actions(user_id);
CREATE INDEX IF NOT EXISTS user_actions_type_idx ON user_actions(type);
CREATE INDEX IF NOT EXISTS user_actions_time_idx ON user_actions(timestamp);

-- Aggregated user behavior profile
CREATE TABLE IF NOT EXISTS user_brains (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  active_hours INTEGER[] DEFAULT ARRAY_FILL(0, ARRAY[24]) NOT NULL,
  preferred_channels JSONB DEFAULT '[]'::jsonb NOT NULL,
  topic_interests JSONB DEFAULT '[]'::jsonb NOT NULL,
  tool_usage_patterns JSONB DEFAULT '{}'::jsonb NOT NULL,
  communication_style JSONB DEFAULT '{}'::jsonb NOT NULL,
  routines JSONB DEFAULT '[]'::jsonb NOT NULL,
  last_analyzed TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS brain_user_idx ON user_brains(user_id);

-- Brain graph nodes (concepts, tools, people, actions, times, places)
CREATE TABLE IF NOT EXISTS brain_nodes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('concept','tool','action','time','place','emotion','person')),
  importance REAL DEFAULT 0.5 NOT NULL CHECK (importance >= 0 AND importance <= 1),
  activation REAL DEFAULT 0 NOT NULL CHECK (activation >= 0 AND activation <= 1),
  metadata JSONB DEFAULT '{}'::jsonb,
  last_activated TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS brain_nodes_user_idx ON brain_nodes(user_id);
CREATE INDEX IF NOT EXISTS brain_node_id_idx ON brain_nodes(node_id);

-- Brain connections (relationships between nodes)
CREATE TABLE IF NOT EXISTS brain_connections (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('uses','thinks_about','during_time','in_place','causes','similar')),
  strength REAL DEFAULT 0.1 NOT NULL CHECK (strength >= 0 AND strength <= 1),
  last_used TIMESTAMP DEFAULT NOW() NOT NULL,
  usage_count INTEGER DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS brain_conn_user_idx ON brain_connections(user_id);
CREATE INDEX IF NOT EXISTS brain_conn_source_idx ON brain_connections(source_id);
CREATE INDEX IF NOT EXISTS brain_conn_target_idx ON brain_connections(target_id);
CREATE UNIQUE INDEX IF NOT EXISTS brain_conn_composite_idx ON brain_connections(user_id, source_id, target_id, type);

-- Brain clusters (auto-grouped node groups for 3D visualization)
CREATE TABLE IF NOT EXISTS brain_clusters (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cluster_id TEXT NOT NULL,
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  node_ids TEXT[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS brain_cluster_user_idx ON brain_clusters(user_id);

-- Enable RLS (since we removed auth, we'll bypass later, but keep structure)
ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_brains ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_clusters ENABLE ROW LEVEL SECURITY;

-- Public access policy (no auth in Shivver)
CREATE POLICY "Public read access" ON user_actions FOR SELECT USING (true);
CREATE POLICY "Public insert" ON user_actions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read access" ON user_brains FOR SELECT USING (true);
CREATE POLICY "Public upsert" ON user_brains FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public read access" ON brain_nodes FOR SELECT USING (true);
CREATE POLICY "Public insert" ON brain_nodes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read access" ON brain_connections FOR SELECT USING (true);
CREATE POLICY "Public insert" ON brain_connections FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read access" ON brain_clusters FOR SELECT USING (true);
CREATE POLICY "Public insert" ON brain_clusters FOR INSERT WITH CHECK (true);
