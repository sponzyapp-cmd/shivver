// Unified Database Entry Point
// Chooses Postgres or SQLite based on SHIVVER_MODE (cloud vs local/offline)

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const mode = process.env.SHIVVER_MODE || 'cloud';

// Static imports for both schemas
import * as pgSchema from './schema';
import * as sqliteSchema from './schema-sqlite';

let db: any;
let schema: any;

if (mode === 'local' || mode === 'offline') {
  // SQLite using better-sqlite3 driver
  const { drizzle } = require('drizzle-orm/better-sqlite3');
  const Database = require('better-sqlite3');

  const dbPath = process.env.SHIVVER_DB_PATH || '~/.shivver/shivver.db';
  const resolvedPath = dbPath.replace('~', process.env.HOME || process.env.USERPROFILE || '/root');

  const sqlite = new Database(resolvedPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // Run migrations (local.ts calls migrateLocalDB on load)
  await import('./local');

  db = drizzle(sqlite, { schema: sqliteSchema });
  schema = sqliteSchema;

  console.log('[DB] SQLite ready');
} else {
  // Cloud Postgres
  const { drizzle } = require('drizzle-orm/postgres-js');
  const postgres = require('postgres');

  const client = postgres(process.env.DATABASE_URL!);
  db = drizzle(client, { schema: pgSchema });
  schema = pgSchema;

  console.log('[DB] Postgres connected');
}

// Exports
export { db };
export const users = schema.users;
export const sessions = schema.sessions;
export const messages = schema.messages;
export const agents = schema.agents;
export const agent_executions = schema.agent_executions;
export const tools = schema.tools;
export const tool_executions = schema.tool_executions;
export const leads = schema.leads;
export const campaigns = schema.campaigns;
export const email_logs = schema.email_logs;
export const brain_nodes = schema.brain_nodes;
export const brain_connections = schema.brain_connections;
export const brain_clusters = schema.brain_clusters;
export const knowledge = schema.knowledge;
export const budget = schema.budget;
export const projects = schema.projects;
export const tasks = schema.tasks;
export const user_actions = schema.user_actions;
export const user_brains = schema.user_brains;
