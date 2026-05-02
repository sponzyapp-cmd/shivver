// Local Database Configuration for Offline Mode
// Uses SQLite file stored at ~/.shivver/shivver.db

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema-sqlite';

const dbPath = process.env.SHIVVER_DB_PATH || '~/.shivver/shivver.db';
const resolvedPath = dbPath.replace('~', process.env.HOME || process.env.USERPROFILE || '/root');

const sqlite = new Database(resolvedPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Run schema migrations/creation
import { migrateLocalDB } from './local';
migrateLocalDB();

export const db = drizzle(sqlite, { schema });

// Re-export schema types
export * from './schema-sqlite';
