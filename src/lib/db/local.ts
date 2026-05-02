// Simple Local Database — SQLite only, for offline operation
// Stores: sessions, messages, agents, agent_executions, tools, tool_executions,
//         leads, campaigns, email_logs, knowledge, brain_nodes, brain_connections

import Database from 'better-sqlite3';
import * as path from 'path';
import { mkdirSync } from 'fs';

const dbPath = process.env.SHIVVER_DB_PATH || path.join(process.env.HOME || '/root', '.shivver', 'shivver.db');
const dbDir = path.dirname(dbPath);
mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema Migration ─────────────────────────────────────────────────────────

export function migrateLocalDB(): void {
  const existing = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'
  `).get();

  if (existing) {
    // Check if leads table exists (v2 schema)
    const hasLeads = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='leads'
    `).get();
    if (hasLeads) {
      console.log('[DB] Up-to-date (v2)');
      return;
    }
    console.log('[DB] Migrating v1 → v2 (adding business tables)...');
    migrateV1toV2();
    return;
  }

  console.log('[DB] Initializing fresh schema (v2)...');
  initV2Schema();
}

function initV2Schema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_session_id TEXT UNIQUE NOT NULL,
      state TEXT DEFAULT '{}',
      metadata TEXT DEFAULT '{}',
      last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      direction TEXT NOT NULL CHECK(direction IN ('inbound','outbound')),
      content_type TEXT NOT NULL CHECK(content_type IN ('text','image','audio','video','file','tool_call','tool_result')),
      content TEXT NOT NULL,
      attachments TEXT DEFAULT '[]',
      message_metadata TEXT DEFAULT '{}',
      agent_state TEXT DEFAULT '{}',
      processing_state TEXT NOT NULL CHECK(processing_state IN ('received','queued','processing','completed','failed','delivered')) DEFAULT 'received',
      error_message TEXT,
      parent_message_id INTEGER REFERENCES messages(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      delivered_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      provider TEXT NOT NULL CHECK(provider IN ('openai','claude','gemini','custom','ollama')),
      model TEXT NOT NULL,
      system_prompt TEXT,
      capabilities TEXT DEFAULT '[]',
      tools TEXT DEFAULT '[]',
      configuration TEXT DEFAULT '{}',
      is_active INTEGER DEFAULT 1 NOT NULL,
      priority INTEGER DEFAULT 100 NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agent_executions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id),
      agent_id INTEGER NOT NULL REFERENCES agents(id),
      message_id INTEGER REFERENCES messages(id),
      input TEXT NOT NULL,
      output TEXT,
      tool_calls TEXT DEFAULT '[]',
      tokens_used INTEGER DEFAULT 0,
      cost TEXT DEFAULT '{}',
      error TEXT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
      completed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS tools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      type TEXT NOT NULL CHECK(type IN ('web_search','fetch_url','execute_code','api_call','file_read','file_write','send_message','tts','stt','image_gen','custom')),
      definition TEXT NOT NULL,
      requires_approval INTEGER DEFAULT 0 NOT NULL,
      rate_limit TEXT,
      configuration TEXT DEFAULT '{}',
      is_active INTEGER DEFAULT 1 NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tool_executions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_execution_id INTEGER NOT NULL REFERENCES agent_executions(id) ON DELETE CASCADE,
      tool_id INTEGER NOT NULL REFERENCES tools(id),
      input TEXT NOT NULL,
      output TEXT,
      error TEXT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
      completed_at DATETIME
    );

    -- Business tables
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT,
      company TEXT,
      website TEXT,
      source_channel TEXT,
      query_used TEXT,
      relevance_score INTEGER DEFAULT 0 NOT NULL,
      pain_points TEXT DEFAULT '[]',
      status TEXT NOT NULL CHECK(status IN ('new','contacted','responded','qualified','lost')) DEFAULT 'new',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      objective TEXT,
      target_icp TEXT,
      sequence TEXT NOT NULL,
      daily_limit INTEGER DEFAULT 10 NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('draft','active','paused','completed')) DEFAULT 'draft',
      started_at DATETIME,
      paused_at DATETIME,
      ended_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER REFERENCES leads(id),
      campaign_id INTEGER REFERENCES campaigns(id),
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      sent_at DATETIME,
      status TEXT NOT NULL CHECK(status IN ('queued','sent','delivered','opened','clicked','bounced','failed')) DEFAULT 'queued',
      error TEXT,
      opens INTEGER DEFAULT 0 NOT NULL,
      clicks INTEGER DEFAULT 0 NOT NULL,
      metadata TEXT DEFAULT '{}'
    );

    -- Brain tables (simplified)
    CREATE TABLE IF NOT EXISTS brain_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      node_id TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('concept','tool','action','time','place','emotion','person')),
      importance REAL DEFAULT 0.5 NOT NULL,
      activation REAL DEFAULT 0 NOT NULL,
      metadata TEXT DEFAULT '{}',
      last_activated DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS brain_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('uses','thinks_about','during_time','in_place','causes','similar')),
      strength REAL DEFAULT 0.1 NOT NULL,
      last_used DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
      usage_count INTEGER DEFAULT 0 NOT NULL
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_agent_executions_session_id ON agent_executions(session_id);
    CREATE INDEX IF NOT EXISTS idx_tool_executions_agent_exec_id ON tool_executions(agent_execution_id);
    CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
    CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
    CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
    CREATE INDEX IF NOT EXISTS idx_brain_nodes_user_id ON brain_nodes(user_id);
    CREATE INDEX IF NOT EXISTS idx_brain_connections_user_id ON brain_connections(user_id);

    -- Seed default tools
    INSERT OR REPLACE INTO tools (name, description, type, definition, requires_approval) VALUES
      ('web_search', 'Search the web using local cache or DuckDuckGo scrape', 'web_search', '{"url": "https://duckduckgo.com/html/", "method": "GET"}', 0),
      ('fetch_url', 'Fetch and extract content from a URL', 'fetch_url', '{"maxChars": 50000}', 0),
      ('execute_code', 'Execute code in a secure sandbox', 'execute_code', '{"runtime": "docker", "timeout": 30}', 1),
      ('send_message', 'Send a message to user via email/chat', 'send_message', '{}', 1),
      ('tts', 'Generate speech audio from text (local TTS)', 'tts', '{"provider": "local"}', 0),
      ('stt', 'Transcribe speech to text (local Whisper)', 'stt', '{"provider": "whisper"}', 0),
      ('image_gen', 'Generate images locally (stable-diffusion)', 'image_gen', '{"provider": "local"}', 0),
      ('api_call', 'Make authenticated API calls', 'api_call', '{"auth": "bearer"}', 1),
      -- Business Automation Tools
      ('lead_finder', 'Find potential leads via local search and extraction', 'custom', '{"query":"string","limit":"number"}', 0),
      ('send_email', 'Send personalized email (local or queued)', 'custom', '{"to":"string","subject":"string","body":"string"}', 1),
      ('create_campaign', 'Create multi-step email campaign', 'custom', '{"name":"string","sequence":"array"}', 1),
      ('track_metrics', 'Pull business analytics from local DB', 'custom', '{"sources":"string[]","period":"string"}', 0),
      ('generate_content', 'Generate marketing content via local LLM', 'custom', '{"type":"string","topic":"string"}', 0),
      ('read_file', 'Read a file from local filesystem', 'custom', '{"path":"string"}', 1),
      ('git_diff', 'Show git diff for source changes', 'custom', '{"file":"string"}', 0),
      ('deploy_vercel', 'Trigger a Vercel deployment', 'custom', '{"projectId":"string"}', 1),
      ('self_improve', 'Analyze code and propose patches', 'custom', '{"goal":"string"}', 0),
      ('monitor_errors', 'Check recent errors and alert', 'custom', '{"hoursBack":"number"}', 0);

    -- Seed default agents (basic)
    INSERT OR REPLACE INTO agents (name, description, provider, model, system_prompt, capabilities, tools, priority) VALUES
      ('Shivver', 'General-purpose primary agent', 'ollama', 'llama3:70b',
       'You are Shivver, a helpful AI assistant. Be concise, competent, and proactive.',
       '["chat","reasoning","planning"]', '[]', 10),
      ('Sales Empire Agent', 'CEO of Revenue', 'ollama', 'llama3:70b',
       'Generate leads, automate outreach, and close deals. Revenue first.',
       '["lead_finder","send_email","create_campaign"]', '[]', 95),
      ('Growth Engine Agent', 'CGO', 'ollama', 'llama3:70b',
       'Own distribution, viral loops, retention optimization.',
       '["track_metrics","generate_content","web_search"]', '[]', 90),
      ('Money Control Agent', 'CFO', 'ollama', 'llama3:70b',
       'Protect revenue, margin, runway. No leaks.',
       '["track_metrics","send_email"]', '[]', 98),
      ('Personal Performance Agent', 'Founder''s Chief of Staff', 'ollama', 'llama3:70b',
       'Optimize founder energy, focus, sleep, decision quality.',
       '["read_file","generate_content"]', '[]', 97);

    -- Seed demo user (id=1)
    INSERT OR IGNORE INTO users (id, email, name, password_hash) VALUES (1, 'demo@shivver.local', 'Demo User', 'placeholder');
  `);
}

function migrateV1toV2(): void {
  // Add new tables if missing
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL, email TEXT, company TEXT, website TEXT,
      source_channel TEXT, query_used TEXT, relevance_score INTEGER DEFAULT 0 NOT NULL,
      pain_points TEXT DEFAULT '[]', status TEXT NOT NULL DEFAULT 'new',
      notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL, objective TEXT, target_icp TEXT, sequence TEXT NOT NULL,
      daily_limit INTEGER DEFAULT 10 NOT NULL, status TEXT NOT NULL DEFAULT 'draft',
      started_at DATETIME, paused_at DATETIME, ended_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER REFERENCES leads(id), campaign_id INTEGER REFERENCES campaigns(id),
      to_email TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL,
      sent_at DATETIME, status TEXT NOT NULL DEFAULT 'queued', error TEXT,
      opens INTEGER DEFAULT 0 NOT NULL, clicks INTEGER DEFAULT 0 NOT NULL, metadata TEXT DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
    CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
    CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
    CREATE INDEX IF NOT EXISTS idx_email_lead ON email_logs(lead_id);
    CREATE INDEX IF NOT EXISTS idx_email_campaign ON email_logs(campaign_id);

    -- Upsert business tools if missing
    INSERT OR IGNORE INTO tools (name, description, type, definition, requires_approval) VALUES
      ('lead_finder','Find leads locally','custom','{}',0),
      ('send_email','Send email (queued)','custom','{}',1),
      ('create_campaign','Create campaign','custom','{}',1),
      ('track_metrics','Track metrics from local DB','custom','{}',0),
      ('generate_content','Generate content via local LLM','custom','{}',0),
      ('read_file','Read file','custom','{}',1),
      ('git_diff','Git diff','custom','{}',0),
      ('self_improve','Self-improve','custom','{}',0),
      ('monitor_errors','Monitor errors','custom','{}',0);
  `);
}

// Run migration on module load
migrateLocalDB();

// ── Raw DB Access ────────────────────────────────────────────────────────────

export default db;
