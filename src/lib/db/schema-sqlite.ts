// SQLite schema for offline mode
// Uses drizzle-orm/sqlite-core

import { sqliteTable, text, integer, real, boolean } from 'drizzle-orm/sqlite-core';

// ── Core Tables ──────────────────────────────────────────────────────────────

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  provider: text('provider', { enum: ['telegram', 'discord', 'slack', 'web'] }).notNull(),
  providerSessionId: text('provider_session_id').notNull().unique(),
  state: text('state').default('{}'),
  metadata: text('metadata').default('{}'),
  lastActivityAt: integer('last_activity_at', { mode: 'timestamp' }).defaultNow().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id').notNull().references(() => sessions.id),
  direction: text('direction', { enum: ['inbound', 'outbound'] }).notNull(),
  contentType: text('content_type', { enum: ['text', 'image', 'audio', 'video', 'file', 'tool_call', 'tool_result'] }).notNull(),
  content: text('content').notNull(),
  attachments: text('attachments').default('[]'),
  messageMetadata: text('message_metadata').default('{}'),
  agentState: text('agent_state').default('{}'),
  processingState: text('processing_state', { enum: ['received', 'queued', 'processing', 'completed', 'failed', 'delivered'] }).default('received').notNull(),
  errorMessage: text('error_message'),
  parentMessageId: integer('parent_message_id').references(() => messages.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  deliveredAt: integer('delivered_at', { mode: 'timestamp' }),
});

export const agents = sqliteTable('agents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  provider: text('provider', { enum: ['openai', 'claude', 'gemini', 'custom', 'ollama'] }).notNull(),
  model: text('model').notNull(),
  systemPrompt: text('system_prompt'),
  capabilities: text('capabilities').default('[]'),
  tools: text('tools').default('[]'),
  configuration: text('configuration').default('{}'),
  isActive: integer('is_active', { mode: 'boolean' }).default(1).notNull(),
  priority: integer('priority').default(100).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const agent_executions = sqliteTable('agent_executions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id').notNull().references(() => sessions.id),
  agentId: integer('agent_id').notNull().references(() => agents.id),
  messageId: integer('message_id').references(() => messages.id),
  input: text('input').notNull(),
  output: text('output'),
  toolCalls: text('tool_calls').default('[]'),
  tokensUsed: integer('tokens_used').default(0),
  cost: text('cost').default('{}'),
  error: text('error'),
  startedAt: integer('started_at', { mode: 'timestamp' }).defaultNow().notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

export const tools = sqliteTable('tools', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  type: text('type', { enum: ['web_search', 'fetch_url', 'execute_code', 'api_call', 'file_read', 'file_write', 'send_message', 'tts', 'stt', 'image_gen', 'custom'] }).notNull(),
  definition: text('definition').notNull(),
  requiresApproval: integer('requires_approval', { mode: 'boolean' }).default(0).notNull(),
  rateLimit: text('rate_limit'),
  configuration: text('configuration').default('{}'),
  isActive: integer('is_active', { mode: 'boolean' }).default(1).notNull(),
});

export const tool_executions = sqliteTable('tool_executions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  agentExecutionId: integer('agent_execution_id').notNull().references(() => agent_executions.id),
  toolId: integer('tool_id').notNull().references(() => tools.id),
  input: text('input').notNull(),
  output: text('output'),
  error: text('error'),
  startedAt: integer('started_at', { mode: 'timestamp' }).defaultNow().notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

export const leads = sqliteTable('leads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  email: text('email'),
  company: text('company'),
  website: text('website'),
  sourceChannel: text('source_channel'),
  queryUsed: text('query_used'),
  relevanceScore: integer('relevance_score').default(0).notNull(),
  painPoints: text('pain_points').default('[]'),
  status: text('status', { enum: ['new','contacted','responded','qualified','lost'] }).default('new'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const campaigns = sqliteTable('campaigns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  objective: text('objective'),
  targetIcp: text('target_icp'),
  sequence: text('sequence').notNull(),
  dailyLimit: integer('daily_limit').default(10).notNull(),
  status: text('status', { enum: ['draft','active','paused','completed'] }).default('draft'),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  pausedAt: integer('paused_at', { mode: 'timestamp' }),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const email_logs = sqliteTable('email_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  leadId: integer('lead_id').references(() => leads.id),
  campaignId: integer('campaign_id').references(() => campaigns.id),
  toEmail: text('to_email').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  status: text('status', { enum: ['queued','sent','delivered','opened','clicked','bounced','failed'] }).default('queued'),
  error: text('error'),
  opens: integer('opens').default(0).notNull(),
  clicks: integer('clicks').default(0).notNull(),
  metadata: text('metadata').default('{}'),
});

// Brain tables
export const brain_nodes = sqliteTable('brain_nodes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  nodeId: text('node_id').notNull(),
  label: text('label').notNull(),
  type: text('type', { enum: ['concept','tool','action','time','place','emotion','person'] }).notNull(),
  importance: real('importance').default(0.5).notNull(),
  activation: real('activation').default(0).notNull(),
  metadata: text('metadata').default('{}'),
  lastActivated: integer('last_activated', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const brain_connections = sqliteTable('brain_connections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  sourceId: text('source_id').notNull(),
  targetId: text('target_id').notNull(),
  type: text('type', { enum: ['uses','thinks_about','during_time','in_place','causes','similar'] }).notNull(),
  strength: real('strength').default(0.1).notNull(),
  lastUsed: integer('last_used', { mode: 'timestamp' }).defaultNow().notNull(),
  usageCount: integer('usage_count').default(0).notNull(),
});

export const brain_clusters = sqliteTable('brain_clusters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  clusterId: text('cluster_id').notNull(),
  label: text('label').notNull(),
  color: text('color').notNull(),
  nodeIds: text('node_ids').default('[]'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

// Additional tables used elsewhere
export const knowledge = sqliteTable('knowledge', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  type: text('type', { enum: ['fact','preference','relationship','project','goal','note'] }).notNull(),
  content: text('content').notNull(),
  embedding: text('embedding').default('[]'),
  metadata: text('metadata').default('{}'),
  confidence: integer('confidence').default(1).notNull(),
  source: text('source'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const budget = sqliteTable('budget', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  periodStart: integer('period_start', { mode: 'timestamp' }).notNull(),
  periodEnd: integer('period_end', { mode: 'timestamp' }).notNull(),
  tokenAllowance: integer('token_allowance').default(1000000).notNull(),
  tokenUsage: integer('token_usage').default(0).notNull(),
  costAllowance: text('cost_allowance').default('{}'),
  costSpent: text('cost_spent').default('{}'),
  alertThreshold: integer('alert_threshold').default(80).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(1).notNull(),
});

export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status', { enum: ['active','paused','completed','archived'] }).default('active').notNull(),
  metadata: text('metadata').default('{}'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id),
  assignedAgentId: integer('assigned_agent_id').references(() => agents.id),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['todo','in_progress','review','done','blocked'] }).default('todo').notNull(),
  priority: integer('priority').default(2).notNull(),
  dependencies: text('dependencies').default('[]'),
  artifacts: text('artifacts').default('[]'),
  result: text('result'),
  error: text('error'),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const user_actions = sqliteTable('user_actions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  channel: text('channel'),
  content: text('content').notNull(),
  duration: integer('duration'),
  success: integer('success', { mode: 'boolean' }),
  timestamp: integer('timestamp', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const user_brains = sqliteTable('user_brains', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id).unique(),
  activeHours: text('active_hours').default('[]'),
  preferredChannels: text('preferred_channels').default('[]'),
  topicInterests: text('topic_interests').default('[]'),
  toolUsagePatterns: text('tool_usage_patterns').default('{}'),
  communicationStyle: text('communication_style').default('{}'),
  routines: text('routines').default('[]'),
  lastAnalyzed: integer('last_analyzed', { mode: 'timestamp' }).defaultNow().notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

// ── TYPES ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type AgentExecution = typeof agent_executions.$inferSelect;
export type Tool = typeof tools.$inferSelect;
export type ToolExecution = typeof tool_executions.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type EmailLog = typeof email_logs.$inferSelect;
export type BrainNode = typeof brain_nodes.$inferSelect;
export type BrainConnection = typeof brain_connections.$inferSelect;
export type BrainCluster = typeof brain_clusters.$inferSelect;
export type Knowledge = typeof knowledge.$inferSelect;
export type Budget = typeof budget.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type UserAction = typeof user_actions.$inferSelect;
export type UserBrain = typeof user_brains.$inferSelect;
