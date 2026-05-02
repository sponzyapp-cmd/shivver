// Event Collector — gathers signals from all data sources and emits AGI events
// Runs every 30 min (or on-demand) to scan for business-critical changes.

import { db, leads, campaigns, email_logs, projects, tasks, agent_executions, users } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { callLLM, type LLMMessage } from '@/lib/llm-provider';
import { execSync } from 'child_process';
import type { AGIEvent } from './orchestrator';

// ── Metric Helpers ────────────────────────────────────────────────────────────

async function getRecentMRR(): Promise<number> {
  try {
    // Try Stripe via direct API if key present
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return 0;

    const resp = await fetch('https://api.stripe.com/v1/invoices?limit=1&status=open', {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    const data = await resp.json();
    return data.data?.[0]?.amount_paid || 0;
  } catch {
    return 0;
  }
}

function getGitChanges(): { changedFiles: string[]; recentCommits: number } {
  try {
    const status = execSync('git status --porcelain', { cwd: '/root/.openclaw/workspace/shivver', encoding: 'utf-8' });
    const changed = status.split('\n').filter(Boolean).map(l => l.slice(3).trim());
    const log = execSync('git log --oneline -5', { cwd: '/root/.openclaw/workspace/shivver', encoding: 'utf-8' });
    const commits = log.split('\n').filter(Boolean).length;
    return { changedFiles: changed, recentCommits: commits };
  } catch {
    return { changedFiles: [], recentCommits: 0 };
  }
}

// ── Event Generators ──────────────────────────────────────────────────────────

// Scan revenue health
async function checkRevenueHealth(): Promise<AGIEvent | null> {
  const mrr = await getRecentMRR(); // placeholder — would need proper Stripe query
  // Placeholder logic; replace with real metric pulls from db.budget or stripe
  const lastBudget = await db.select().from('budget').limit(1);
  // For now mock
  if (mrr < 1000) {
    return {
      type: 'cash_low',
      payload: { mrr, threshold: 1000, gap: 1000 - mrr },
      timestamp: new Date(),
      source: 'cron',
      severity: 'high',
    };
  }
  return null;
}

// Scan leads pipeline
async function checkLeadFlow(): Promise<AGIEvent | null> {
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const newLeads = await db
    .select()
    .from(leads)
    .where(/* date condition */)
    .limit(1);

  if (newLeads.length === 0) {
    return {
      type: 'pipeline_gap',
      payload: { message: 'No new leads in last 24h' },
      timestamp: new Date(),
      source: 'cron',
      severity: 'medium',
    };
  }
  return null;
}

// Scan system health
function checkSystemHealth(): AGIEvent | null {
  const { changedFiles, recentCommits } = getGitChanges();
  const hasUntracked = changedFiles.some(f => !f.startsWith('node_modules') && !f.startsWith('.next'));

  if (hasUntracked) {
    return {
      type: 'system_error',
      payload: { changedFiles, recentCommits, note: 'Uncommitted changes detected' },
      timestamp: new Date(),
      source: 'cron',
      severity: 'medium',
    };
  }
  return null;
}

// Competitor monitoring (simple web search)
async function checkCompetitorNews(): Promise<AGIEvent | null> {
  try {
    const exaKey = process.env.EXA_API_KEY;
    if (!exaKey) return null;

    const queries = ['competitor pricing changes', 'new saas product launch', 'startup funding news'];
    // Just a placeholder; would use agent tool instead
    return null;
  } catch {
    return null;
  }
}

// Founder personal metrics (from calendar/health apps) — placeholder
function checkFounderPerformance(): AGIEvent | null {
  // Integrate with calendar, sleep tracker later
  return null;
}

// ── Main Collector ────────────────────────────────────────────────────────────

export async function collectEvents(): Promise<AGIEvent[]> {
  const events: AGIEvent[] = [];

  // Revenue scan
  const revEvent = await checkRevenueHealth();
  if (revEvent) events.push(revEvent);

  // Lead flow
  const leadEvent = await checkLeadFlow();
  if (leadEvent) events.push(leadEvent);

  // System health
  const sysEvent = checkSystemHealth();
  if (sysEvent) events.push(sysEvent);

  // Competitor scan (daily only)
  const compEvent = await checkCompetitorNews();
  if (compEvent) events.push(compEvent);

  // Founder perf
  const perfEvent = checkFounderPerformance();
  if (perfEvent) events.push(perfEvent);

  return events;
}

// One-off: run the AGI on a specific user request from Telegram
export async function processFounderCommand(command: string): Promise<string[]> {
  // Convert command → AGIEvent with type 'user_command'
  const event: AGIEvent = {
    type: 'user_command',
    payload: { command },
    timestamp: new Date(),
    source: 'user',
    severity: 'high',
  };

  const { processEvent } = await import('./orchestrator');
  const results = await processEvent(event);

  // Flatten Telegram messages from all agents
  const messages: string[] = [];
  for (const result of results) {
    result.telegramMessages.forEach(tm => messages.push(tm.text));
  }
  return messages;
}
