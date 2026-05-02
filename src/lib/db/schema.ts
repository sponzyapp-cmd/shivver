import { pgTable, serial, integer, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  provider: text('provider', { enum: ['telegram', 'discord', 'slack', 'web'] }).notNull(),
  providerSessionId: text('provider_session_id').notNull().unique(),
  state: jsonb('state').$type<Record<string, any>>().default({}),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  lastActivityAt: timestamp('last_activity_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  providerIdx: index('provider_idx').on(table.provider),
  userIdIdx: index('user_id_idx').on(table.userId),
}));

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  sessionId: serial('session_id').notNull().references(() => sessions.id),
  direction: text('direction', { enum: ['inbound', 'outbound'] }).notNull(),
  contentType: text('content_type', { enum: ['text', 'image', 'audio', 'video', 'file', 'tool_call', 'tool_result'] }).notNull(),
  content: text('content').notNull(),
  attachments: jsonb('attachments').$type<Array<{url: string; type: string; name?: string}>>().default([]),
  messageMetadata: jsonb('message_metadata').$type<Record<string, any>>().default({}),
  agentState: jsonb('agent_state').$type<Record<string, any>>().default({}),
  processingState: text('processing_state', { enum: ['received', 'queued', 'processing', 'completed', 'failed', 'delivered'] }).default('received').notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deliveredAt: timestamp('delivered_at'),
}, (table) => ({
  sessionIdx: index('messages_session_idx').on(table.sessionId),
  processingStateIdx: index('processing_state_idx').on(table.processingState),
  createdAtIdx: index('created_at_idx').on(table.createdAt),
}));

export const agents = pgTable('agents', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  provider: text('provider', { enum: ['openai', 'claude', 'gemini', 'custom'] }).notNull(),
  model: text('model').notNull(),
  systemPrompt: text('system_prompt'),
  capabilities: jsonb('capabilities').$type<string[]>().default([]),
  tools: jsonb('tools').$type<Array<{name: string; description: string; parameters: Record<string, any>}>>().default([]),
  configuration: jsonb('configuration').$type<Record<string, any>>().default({}),
  isActive: boolean('is_active').default(true).notNull(),
  priority: serial('priority').default(100).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const agent_executions = pgTable('agent_executions', {
  id: serial('id').primaryKey(),
  sessionId: serial('session_id').notNull().references(() => sessions.id),
  agentId: serial('agent_id').notNull().references(() => agents.id),
  messageId: serial('message_id').references(() => messages.id),
  input: jsonb('input').$type<Record<string, any>>().notNull(),
  output: jsonb('output').$type<Record<string, any>>(),
  toolCalls: jsonb('tool_calls').$type<Array<{tool: string; args: Record<string, any>; result: any}>>().default([]),
  tokensUsed: serial('tokens_used').default(0),
  cost: jsonb('cost').$type<{input?: number; output?: number; total?: number}>().default({}),
  error: text('error'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

export const tools = pgTable('tools', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  type: text('type', { enum: ['web_search', 'fetch_url', 'execute_code', 'api_call', 'file_read', 'file_write', 'send_message', 'custom'] }).notNull(),
  definition: jsonb('definition').$type<Record<string, any>>().notNull(),
  requiresApproval: boolean('requires_approval').default(false).notNull(),
  rateLimit: text('rate_limit'), // e.g. "60/min"
  configuration: jsonb('configuration').$type<Record<string, any>>().default({}),
  isActive: boolean('is_active').default(true).notNull(),
});

export const tool_executions = pgTable('tool_executions', {
  id: serial('id').primaryKey(),
  agentExecutionId: serial('agent_execution_id').notNull().references(() => agent_executions.id),
  toolId: serial('tool_id').notNull().references(() => tools.id),
  input: jsonb('input').$type<Record<string, any>>().notNull(),
  output: jsonb('output'),
  error: text('error'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

export const knowledge = pgTable('knowledge', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').notNull().references(() => users.id),
  type: text('type', { enum: ['fact', 'preference', 'relationship', 'project', 'goal', 'note'] }).notNull(),
  content: text('content').notNull(),
  embedding: jsonb('embedding').$type<number[]>().default([]),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  confidence: serial('confidence').default(1.0).notNull(),
  source: text('source'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const budget = pgTable('budget', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').notNull().references(() => users.id),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  tokenAllowance: serial('token_allowance').default(1000000).notNull(),
  tokenUsage: serial('token_usage').default(0).notNull(),
  costAllowance: jsonb('cost_allowance').$type<{daily?: number; monthly?: number; total?: number}>().default({}),
  costSpent: jsonb('cost_spent').$type<{daily?: number; monthly?: number; total?: number}>().default({}),
  alertThreshold: serial('alert_threshold').default(80).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
}, (table) => ({
  userIdIdx: index('budget_user_idx').on(table.userId),
  periodIdx: index('budget_period_idx').on(table.periodStart, table.periodEnd),
}));

// Project & task management (CrewAI pattern)
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status', { enum: ['active', 'paused', 'completed', 'archived'] }).default('active').notNull(),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  projectId: serial('project_id').notNull().references(() => projects.id),
  assignedAgentId: serial('assigned_agent_id').references(() => agents.id),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['todo', 'in_progress', 'review', 'done', 'blocked'] }).default('todo').notNull(),
  priority: serial('priority').default(2).notNull(),
  dependencies: jsonb('dependencies').$type<number[]>().default([]),
  artifacts: jsonb('artifacts').$type<Array<{type: string; content: string; name?: string}>>().default([]),
  result: jsonb('result').$type<Record<string, any>>(),
  error: text('error'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── USER BRAIN: Cognitive model & behavior tracking ────────────────────────
export const user_actions = pgTable('user_actions', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').notNull().references(() => users.id),
  type: text('type').notNull(), // 'message_sent', 'tool_used', 'computer_action', etc.
  channel: text('channel'),
  content: jsonb('content').$type<Record<string, any>>().notNull(),
  duration: serial('duration'), // milliseconds if applicable
  success: boolean('success'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_actions_user_idx').on(table.userId),
  typeIdx: index('user_actions_type_idx').on(table.type),
  timestampIdx: index('user_actions_time_idx').on(table.timestamp),
}));

export const user_brains = pgTable('user_brains', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').notNull().references(() => users.id).unique(),
  // Active hours (array of 24 counts)
  activeHours: jsonb('active_hours').$type<number[]>().default(Array(24).fill(0)),
  // Channel preference [{channel: string, usage: number}]
  preferredChannels: jsonb('preferred_channels').$type<Array<{channel: string; usage: number}> >().default([]),
  // Topic interests [{topic: string, score: number}]
  topicInterests: jsonb('topic_interests').$type<Array<{topic: string; score: number}> >().default([]),
  // Tool usage: {tool_name: {count, avgDuration, successRate}}
  toolUsagePatterns: jsonb('tool_usage_patterns').$type<Record<string, {count: number; avgDuration: number; successRate: number}> >().default({}),
  // Communication style metrics
  communicationStyle: jsonb('communication_style').$type<{
    avgMessageLength: number;
    formalityLevel: number; // 0-1
    emojiFreq: number;
    questionRatio: number;
  }>().default({ avgMessageLength: 0, formalityLevel: 0.5, emojiFreq: 0, questionRatio: 0 }),
  // Routines [{name, schedule (cron), actions[]]
  routines: jsonb('routines').$type<Array<{name: string; schedule: string; actions: string[]}> >().default([]),
  lastAnalyzed: timestamp('last_analyzed').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3D brain graph nodes (concepts, tools, people, activities)
export const brain_nodes = pgTable('brain_nodes', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').notNull().references(() => users.id),
  nodeId: text('node_id').notNull(), // stable ID (e.g. "tool-web_search")
  label: text('label').notNull(),
  type: text('type', { enum: ['concept', 'tool', 'action', 'time', 'place', 'emotion', 'person'] }).notNull(),
  importance: serial('importance').default(0.5).notNull(), // 0-1
  activation: serial('activation').default(0).notNull(), // current activation level (0-1)
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  lastActivated: timestamp('last_activated'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('brain_nodes_user_idx').on(table.userId),
  nodeIdIdx: index('brain_node_id_idx').on(table.nodeId),
}));

// Connections between brain nodes (how concepts relate)
export const brain_connections = pgTable('brain_connections', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').notNull().references(() => users.id),
  sourceId: text('source_id').notNull(),
  targetId: text('target_id').notNull(),
  type: text('type', { enum: ['uses', 'thinks_about', 'during_time', 'in_place', 'causes', 'similar'] }).notNull(),
  strength: serial('strength').default(0.1).notNull(), // 0-1
  lastUsed: timestamp('last_used').defaultNow().notNull(),
  usageCount: serial('usage_count').default(0).notNull(),
}, (table) => ({
  userIdIdx: index('brain_conn_user_idx').on(table.userId),
  sourceIdx: index('brain_conn_source_idx').on(table.sourceId),
  targetIdx: index('brain_conn_target_idx').on(table.targetId),
  compositeIdx: index('brain_conn_composite_idx').on(table.userId, table.sourceId, table.targetId, table.type),
}));

// Clusters (auto-grouped node groups for 3D visualization)
export const brain_clusters = pgTable('brain_clusters', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').notNull().references(() => users.id),
  clusterId: text('cluster_id').notNull(),
  label: text('label').notNull(),
  color: text('color').notNull(), // hex color
  nodeIds: jsonb('node_ids').$type<string[]>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('brain_cluster_user_idx').on(table.userId),
}));

// ── BUSINESS AUTOMATION TABLES ─────────────────────────────────────────────

export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  email: text('email'),
  company: text('company'),
  website: text('website'),
  sourceChannel: text('source_channel'),
  queryUsed: text('query_used'),
  relevanceScore: serial('relevance_score').default(0),
  painPoints: jsonb('pain_points').$type<string[]>().default([]),
  status: text('status', { enum: ['new', 'contacted', 'responded', 'qualified', 'lost'] }).default('new'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('leads_user_idx').on(table.userId),
  emailIdx: index('leads_email_idx').on(table.email),
}));

export const campaigns = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  objective: text('objective'),
  targetIcp: text('target_icp'),
  sequence: jsonb('sequence').$type<Array<{day: number; subject: string; template: string}> >().notNull(),
  dailyLimit: serial('daily_limit').default(10),
  status: text('status', { enum: ['draft', 'active', 'paused', 'completed'] }).default('draft'),
  startedAt: timestamp('started_at'),
  pausedAt: timestamp('paused_at'),
  endedAt: timestamp('ended_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const email_logs = pgTable('email_logs', {
  id: serial('id').primaryKey(),
  leadId: serial('lead_id').references(() => leads.id),
  campaignId: serial('campaign_id').references(() => campaigns.id),
  toEmail: text('to_email').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  sentAt: timestamp('sent_at'),
  status: text('status', { enum: ['queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'] }).default('queued'),
  error: text('error'),
  opens: serial('opens').default(0),
  clicks: serial('clicks').default(0),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
}, (table) => ({
  leadIdx: index('email_lead_idx').on(table.leadId),
  campaignIdx: index('email_campaign_idx').on(table.campaignId),
  statusIdx: index('email_status_idx').on(table.status),
}));

// ── TYPE EXPORTS ────────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type AgentExecution = typeof agent_executions.$inferSelect;
export type Tool = typeof tools.$inferSelect;
export type ToolExecution = typeof tool_executions.$inferSelect;
export type Knowledge = typeof knowledge.$inferSelect;
export type Budget = typeof budget.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type UserAction = typeof user_actions.$inferSelect;
export type UserBrain = typeof user_brains.$inferSelect;
export type BrainNode = typeof brain_nodes.$inferSelect;
export type BrainConnection = typeof brain_connections.$inferSelect;
export type BrainCluster = typeof brain_clusters.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type EmailLog = typeof email_logs.$inferSelect;
