-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Users (compatible with Supabase Auth)
create table if not exists public.users (
  id uuid references auth.users not null primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  preferences jsonb default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Sessions (same as our Drizzle schema, but in Supabase)
create table if not exists public.sessions (
  id bigserial primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  provider text not null check (provider in ('telegram', 'discord', 'slack', 'web', 'api')),
  provider_session_id text unique not null,
  state jsonb default '{}',
  metadata jsonb default '{}',
  last_activity_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists sessions_user_id_idx on public.sessions(user_id);
create index if not exists sessions_provider_idx on public.sessions(provider);

-- Messages
create table if not exists public.messages (
  id bigserial primary key,
  session_id bigint references public.sessions(id) on delete cascade not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  content_type text not null check (content_type in ('text', 'image', 'audio', 'video', 'file', 'tool_call', 'tool_result')),
  content text not null,
  attachments jsonb default '[]',
  message_metadata jsonb default '{}',
  agent_state jsonb default '{}',
  processing_state text not null check (processing_state in ('received', 'queued', 'processing', 'completed', 'failed', 'delivered')) default 'received',
  error_message text,
  parent_message_id bigint references public.messages(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  delivered_at timestamp with time zone
);

create index if not exists messages_session_idx on public.messages(session_id);
create index if not exists messages_processing_state_idx on public.messages(processing_state);
create index if not exists messages_created_at_idx on public.messages(created_at desc);

-- Agents
create table if not exists public.agents (
  id bigserial primary key,
  name text not null,
  description text,
  provider text not null check (provider in ('openai', 'claude', 'gemini', 'custom')),
  model text not null,
  system_prompt text,
  capabilities jsonb default '[]',
  tools jsonb default '[]',
  configuration jsonb default '{}',
  is_active boolean default true not null,
  priority integer default 100 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Agent executions (per-message runs)
create table if not exists public.agent_executions (
  id bigserial primary key,
  session_id bigint references public.sessions(id) not null,
  agent_id bigint references public.agents(id) not null,
  message_id bigint references public.messages(id),
  input jsonb not null,
  output jsonb,
  tool_calls jsonb default '[]',
  tokens_used integer default 0,
  cost jsonb default '{}',
  error text,
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone
);

-- Tools
create table if not exists public.tools (
  id bigserial primary key,
  name text unique not null,
  description text,
  type text not null check (type in ('web_search', 'fetch_url', 'execute_code', 'api_call', 'file_read', 'file_write', 'send_message', 'tts', 'stt', 'image_gen', 'custom')),
  definition jsonb not null,
  requires_approval boolean default false not null,
  rate_limit text,
  configuration jsonb default '{}',
  is_active boolean default true not null
);

-- Tool executions
create table if not exists public.tool_executions (
  id bigserial primary key,
  agent_execution_id bigint references public.agent_executions(id) on delete cascade not null,
  tool_id bigint references public.tools(id) not null,
  input jsonb not null,
  output jsonb,
  error text,
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone
);

-- Knowledge (long-term memory, vector-ready)
create table if not exists public.knowledge (
  id bigserial primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  type text not null check (type in ('fact', 'preference', 'relationship', 'project', 'goal', 'note', 'memory')),
  content text not null,
  embedding vector(1536),  -- OpenAI embeddings
  metadata jsonb default '{}',
  confidence float default 1.0 not null,
  source text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists knowledge_user_id_idx on public.knowledge(user_id);
create index if not exists knowledge_embedding_idx on public.knowledge using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Budget tracking
create table if not exists public.budget (
  id bigserial primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  period_start date not null,
  period_end date not null,
  token_allowance bigint default 1000000 not null,
  token_usage bigint default 0 not null,
  cost_allowance jsonb default '{}',
  cost_spent jsonb default '{}',
  alert_threshold integer default 80 not null,
  is_active boolean default true not null,
  unique(user_id, period_start, period_end)
);

create index if not exists budget_user_id_idx on public.budget(user_id);

-- Projects (CrewAI pattern)
create table if not exists public.projects (
  id bigserial primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  description text,
  status text not null check (status in ('active', 'paused', 'completed', 'archived')) default 'active',
  metadata jsonb default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tasks
create table if not exists public.tasks (
  id bigserial primary key,
  project_id bigint references public.projects(id) on delete cascade not null,
  assigned_agent_id bigint references public.agents(id),
  title text not null,
  description text,
  status text not null check (status in ('todo', 'in_progress', 'review', 'done', 'blocked')) default 'todo',
  priority integer default 2 not null,
  dependencies jsonb default '[]',
  artifacts jsonb default '[]',
  result jsonb,
  error text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (Row Level Security)
alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.messages enable row level security;
alter table public.agents enable row level security;
alter table public.agent_executions enable row level security;
alter table public.tools enable row level security;
alter table public.tool_executions enable row level security;
alter table public.knowledge enable row level security;
alter table public.budget enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;

-- Simple policies (adjust as needed)
create policy "Users can view own data" on public.users for select using (auth.uid() = id);
create policy "Users can update own data" on public.users for update using (auth.uid() = id);

create policy "Users can view own sessions" on public.sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions" on public.sessions for insert with check (auth.uid() = user_id);

create policy "Users can view own messages" on public.messages for select using (
  session_id in (select id from public.sessions where user_id = auth.uid())
);
create policy "Users can insert own messages" on public.messages for insert with check (
  session_id in (select id from public.sessions where user_id = auth.uid())
);

create policy "Users can view own knowledge" on public.knowledge for select using (auth.uid() = user_id);
create policy "Users can insert own knowledge" on public.knowledge for insert with check (auth.uid() = user_id);
create policy "Users can update own knowledge" on public.knowledge for update using (auth.uid() = user_id);

create policy "Users can view own projects" on public.projects for select using (auth.uid() = user_id);
create policy "Users can manage own projects" on public.projects for all using (auth.uid() = user_id);

create policy "Users can view own tasks" on public.tasks for select using (
  project_id in (select id from public.projects where user_id = auth.uid())
);
create policy "Users can manage own tasks" on public.tasks for all using (
  project_id in (select id from public.projects where user_id = auth.uid())
);

-- Seed default agents
insert into public.agents (name, description, provider, model, system_prompt, capabilities, tools, priority) values
  ('Shivver', 'General-purpose primary agent', 'openai', 'gpt-4o-mini',
   'You are Shivver, a helpful AI assistant inspired by JARVIS and The Machine. Be concise, competent, and proactive.',
   '["chat", "reasoning", "planning"]', '[]', 10),
  ('Researcher', 'Web research and data gathering', 'openai', 'gpt-4o-mini',
   'You are a research specialist. Find accurate, cited information from the web.',
   '["web_search", "url_fetch", "data_synthesis"]', '[]', 20),
  ('Coder', 'Software development and debugging', 'openai', 'gpt-4o-mini',
   'You are an expert programmer. Write clean, efficient code with thorough explanations.',
   '["code_generation", "code_review", "debugging", "git"]', '[]', 20),
  ('Writer', 'Content creation and editing', 'openai', 'gpt-4o-mini',
   'You are a skilled writer. Create clear, engaging content tailored to the audience.',
   '["writing", "editing", "summarization", "style"]', '[]', 20),
  ('Analyst', 'Data analysis and visualization', 'openai', 'gpt-4o-mini',
   'You are a data analyst. Identify patterns, create insights, and suggest actions.',
   '["data_analysis", "visualization", "statistics"]', '[]', 20),
  ('Creative', 'Creative tasks: images, stories, concepts', 'openai', 'gpt-4o-mini',
   'You are a creative agent for ideation, design, and artistic tasks.',
   '["ideation", "design", "brainstorming", "concepts"]', '[]', 30);

-- Seed built-in tools
insert into public.tools (name, description, type, definition, requires_approval) values
  ('web_search', 'Search the web using Exa neural search', 'web_search',
   '{"url": "https://api.exa.ai/search", "method": "POST"}', false),
  ('fetch_url', 'Fetch and extract content from a URL', 'fetch_url',
   '{"maxChars": 50000}', false),
  ('execute_code', 'Execute code in a secure sandbox', 'execute_code',
   '{"runtime": "docker", "timeout": 30}', true),
  ('send_message', 'Send a message to user via email/chat', 'send_message',
   '{}', true),
  ('tts', 'Generate speech audio from text', 'tts',
   '{"provider": "elevenlabs"}', false),
  ('stt', 'Transcribe speech to text', 'stt',
   '{"provider": "whisper"}', false),
  ('image_gen', 'Generate images from text prompts', 'image_gen',
   '{"provider": "openai"}', false),
  ('api_call', 'Make authenticated API calls', 'api_call',
   '{"auth": "bearer"}', true);

-- ── BRAIN SEED DATA ────────────────────────────────────────────────────────
-- Pre-populate demo user's brain with starter nodes/connections so
-- the 3D visualization isn't empty on first deploy.

-- Demo user (must match your users table)
-- Insert demo brain nodes (for user_id = 1)
insert into public.brain_nodes (user_id, node_id, label, type, importance, activation, metadata) values
  -- Core actions
  (1, 'action-chat', 'Chat', 'action', 0.9, 0.8, '{"frequency": "high"}'),
  (1, 'action-search', 'Web Search', 'tool', 0.7, 0.4, '{"tool": "exa"}'),
  (1, 'action-tts', 'Text-to-Speech', 'tool', 0.5, 0.2, '{"provider": "elevenlabs"}'),
  (1, 'action-stt', 'Speech-to-Text', 'tool', 0.5, 0.2, '{"provider": "whisper"}'),
  (1, 'action-fetch', 'Fetch URL', 'tool', 0.6, 0.3, '{"extractor": "jina"}'),
  (1, 'action-code', 'Code Exec', 'tool', 0.8, 0.6, '{"sandbox": "docker"}'),

  -- Concepts (extracted from demo conversation history)
  (1, 'concept-ai', 'AI', 'concept', 0.9, 0.9, '{"mentions": 24}'),
  (1, 'concept-machine_learning', 'Machine Learning', 'concept', 0.7, 0.5, '{"mentions": 8}'),
  (1, 'concept-3d_modeling', '3D Modeling', 'concept', 0.8, 0.7, '{"apps": ["Blender"]}'),
  (1, 'concept-video_editing', 'Video Editing', 'concept', 0.75, 0.6, '{"apps": ["DaVinci Resolve"]}'),
  (1, 'concept-automation', 'Automation', 'concept', 0.85, 0.8, '{"goal": "full desktop control"}'),
  (1, 'concept-voice', 'Voice', 'concept', 0.6, 0.4, '{"tts": true, "stt": true}'),
  (1, 'concept-brain', 'User Brain', 'concept', 0.95, 0.6, '{"visualization": "3d"}'),

  -- Applications / places
  (1, 'app-blender', 'Blender', 'place', 0.8, 0.7, '{"automation_target": true}'),
  (1, 'app-davinci', 'DaVinci Resolve', 'place', 0.75, 0.6, '{"automation_target": true}'),
  (1, 'app-browser', 'Browser', 'place', 0.7, 0.5, '{"automation": true}'),
  (1, 'app-desktop', 'Desktop', 'place', 0.6, 0.3, '{"full_control": true}'),

  -- Time nodes (circadian rhythm)
  (1, 'time-morning', 'Morning (06–12)', 'time', 0.4, 0.2, '{"active_hours": [9,10,11]}'),
  (1, 'time-afternoon', 'Afternoon (12–18)', 'time', 0.6, 0.5, '{"active_hours": [14,15,16]}'),
  (1, 'time-evening', 'Evening (18–24)', 'time', 0.5, 0.3, '{}'),

  -- Person (user)
  (1, 'person-user', 'You', 'person', 1.0, 1.0, '{"role": "owner"}');

-- Brain connections (semantic + usage links)
insert into public.brain_connections (user_id, source_id, target_id, type, strength, usage_count) values
  -- User uses tools to interact with concepts
  (1, 'tool-web_search', 'concept-ai', 'thinks_about', 0.6, 12),
  (1, 'tool-web_search', 'concept-machine_learning', 'thinks_about', 0.7, 8),
  (1, 'tool-web_search', 'concept-automation', 'thinks_about', 0.8, 15),

  (1, 'tool-execute_code', 'concept-automation', 'causes', 0.9, 4),
  (1, 'tool-execute_code', 'app-desktop', 'in_place', 0.5, 2),

  (1, 'tool-computer_action', 'app-blender', 'uses', 0.9, 6),
  (1, 'tool-computer_action', 'app-davinci', 'uses', 0.85, 5),
  (1, 'tool-computer_action', 'app-browser', 'uses', 0.7, 18),

  -- Brain nodes imply actions
  (1, 'concept-3d_modeling', 'app-blender', 'uses', 0.9, 7),
  (1, 'concept-video_editing', 'app-davinci', 'uses', 0.85, 5),

  -- Time patterns
  (1, 'time-afternoon', 'action-chat', 'during_time', 0.65, 30),
  (1, 'time-morning', 'action-search', 'during_time', 0.4, 8),
  (1, 'time-evening', 'action-code', 'during_time', 0.5, 6),

  -- Personal centrality
  (1, 'person-user', 'concept-ai', 'thinks_about', 0.9, 50),
  (1, 'person-user', 'action-chat', 'uses', 1.0, 120),
  (1, 'person-user', 'concept-brain', 'thinks_about', 0.8, 3),
  (1, 'person-user', 'app-desktop', 'uses', 0.7, 10);

-- Brain clusters (group nodes by theme for 3D positioning)
insert into public.brain_clusters (user_id, cluster_id, label, color, node_ids) values
  (1, 'cluster-tools', 'Tools', '#22c55e', '{"tool-web_search", "tool-tts", "tool-stt", "tool-fetch", "tool-execute_code", "tool-computer_action"}'),
  (1, 'cluster-concepts', 'Concepts', '#6366f1', '{"concept-ai", "concept-machine_learning", "concept-3d_modeling", "concept-video_editing", "concept-automation", "concept-voice", "concept-brain"}'),
  (1, 'cluster-apps', 'Applications', '#3b82f6', '{"app-blender", "app-davinci", "app-browser", "app-desktop"}'),
  (1, 'cluster-time', 'Time', '#8b5cf6', '{"time-morning", "time-afternoon", "time-evening"}'),
  (1, 'cluster-user', 'User', '#f59e0b', '{"person-user"}');

-- Seed some initial user actions (last hour) to show activity
insert into public.user_actions (user_id, type, channel, content) values
  (1, 'message_sent', 'web', '{"content": "Create a 3D cube in Blender"}'),
  (1, 'tool_used',  'web', '{"tool": "computer_action", "action": "click", "success": true}'),
  (1, 'tool_used',  'web', '{"tool": "web_search", "query": "Blender Python API cube", "success": true}'),
  (1, 'message_sent', 'web', '{"content": "How do I edit video in DaVinci?"}'),
  (1, 'tool_used',  'web', '{"tool": "web_search", "query": "DaVinci Resolve Fusion scripting tutorial", "success": true}'),
  (1, 'computer_action', 'desktop', '{"action": "open", "application": "DaVinci Resolve"}', null, false),
  (1, 'message_sent', 'web', '{"content": "What''s in my brain?"}');

-- ── USER BRAIN: Cognitive model & behavior tracking ────────────────────────
-- Immutable action stream (every user interaction)
create table if not exists public.user_actions (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  type text not null, -- 'message_sent', 'tool_used', 'computer_action', 'voice_input', etc.
  channel text,
  content jsonb not null,
  duration integer, -- milliseconds
  success boolean,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists user_actions_user_idx on public.user_actions(user_id);
create index if not exists user_actions_type_idx on public.user_actions(type);
create index if not exists user_actions_time_idx on public.user_actions(timestamp);

-- Aggregated user behavior profile (derived from user_actions)
create table if not exists public.user_brains (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade unique,
  active_hours integer[] default array_fill(0, array[24]) not null,
  preferred_channels jsonb default '[]'::jsonb not null,
  topic_interests jsonb default '[]'::jsonb not null,
  tool_usage_patterns jsonb default '{}'::jsonb not null,
  communication_style jsonb default '{}'::jsonb not null,
  routines jsonb default '[]'::jsonb not null,
  last_analyzed timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists brain_user_idx on public.user_brains(user_id);

-- Brain graph nodes (concepts, tools, actions, people, places, emotions)
create table if not exists public.brain_nodes (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  node_id text not null,
  label text not null,
  type text not null check (type in ('concept','tool','action','time','place','emotion','person')),
  importance float default 0.5 not null check (importance >= 0 and importance <= 1),
  activation float default 0 not null check (activation >= 0 and activation <= 1),
  metadata jsonb default '{}',
  last_activated timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists brain_nodes_user_idx on public.brain_nodes(user_id);
create unique index if not exists brain_node_id_idx on public.brain_nodes(user_id, node_id); -- per-user unique IDs

-- Brain connections (relationships between nodes)
create table if not exists public.brain_connections (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  source_id text not null,
  target_id text not null,
  type text not null check (type in ('uses','thinks_about','during_time','in_place','causes','similar')),
  strength float default 0.1 not null check (strength >= 0 and strength <= 1),
  last_used timestamp with time zone default timezone('utc'::text, now()) not null,
  usage_count integer default 0 not null
);

create index if not exists brain_conn_user_idx on public.brain_connections(user_id);
create index if not exists brain_conn_source_idx on public.brain_connections(source_id);
create index if not exists brain_conn_target_idx on public.brain_connections(target_id);
create unique index if not exists brain_conn_composite_idx on public.brain_connections(user_id, source_id, target_id, type);

-- Brain clusters (auto-grouped node sets for 3D visualization)
create table if not exists public.brain_clusters (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  cluster_id text not null,
  label text not null,
  color text not null,
  node_ids text[] not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists brain_cluster_user_idx on public.brain_clusters(user_id);

-- ── PUBLIC ACCESS POLICIES (no auth) ──────────────────────────────────────
-- Since Shivver has no auth, we allow read/write to these tables publicly
-- In production with auth, replace with proper RLS
create policy "public_read" on public.user_actions for select using (true);
create policy "public_insert" on public.user_actions for insert with check (true);
create policy "public_read" on public.user_brains for select using (true);
create policy "public_upsert" on public.user_brains for all using (true) with check (true);
create policy "public_read" on public.brain_nodes for select using (true);
create policy "public_insert" on public.brain_nodes for insert with check (true);
create policy "public_update" on public.brain_nodes for update using (true);
create policy "public_read" on public.brain_connections for select using (true);
create policy "public_insert" on public.brain_connections for insert with check (true);
create policy "public_read" on public.brain_clusters for select using (true);
create policy "public_insert" on public.brain_clusters for insert with check (true);
