// Daily Founder Report Generator
// Produces a concise, brutal Telegram-formatted daily brief.

import { db, leads, campaigns, email_logs, agent_executions, tools, tool_executions, projects, tasks, knowledge } from '@/lib/db';
import { eq, sql, desc, gte, lt } from 'drizzle-orm';
import { callLLM, type LLMMessage } from '@/lib/llm-provider';

export interface DailyMetrics {
  date: string;
  revenue: { today: number; change: number };
  leads: { newToday: number; qualified: number; pipelineValue: number };
  emails: { sent: number; opened: number; clicked: number };
  system: { errors24h: number; buildStatus: 'ok' | 'failed'; uptime: number };
  founder: { deepWorkHours: number; decisionsMade: number; energyScore: number };
  topOpportunity: string;
  biggestRisk: string;
}

export async function generateDailyReport(): Promise<string> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yyyy = yesterday.getFullYear();
  const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
  const dd = String(yesterday.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  // Collect raw metrics
  const metrics = await collectMetrics(dateStr);

  // Use LLM to synthesize into brutal clarity format
  const systemPrompt = `You are the Founder's AGI War Room. Generate a DAILY REPORT for a founder building a billion-dollar SaaS business.

Format:
📊 DAILY REPORT — ${dateStr}

REVENUE
Today: $X,XXX (Δ Y%)
Risk: [short phrase]

LEADS
New: N | Qualified: Q | Pipeline: $P
Hot: [list top 3 by relevance]

EMAIL
Sent: N | Opened: O% | Clicked: C%

SYSTEM
Build: ✅/❌ | Errors 24h: E | Uptime: Z%

FOUNDER
Deep work: H hrs | Decisions: D | Energy: E/10

⚠️ BIGGEST RISK
[one-sentence threat, financial impact]

🚀 TOP LEVERAGE ACTION
[single highest-impact action for today]

KILL THIS TODAY
[one thing to delete/stop immediately]

💡 HIDDEN OPPORTUNITY
[something overlooked with high upside]`;

  const userContent = `Metrics JSON: ${JSON.stringify(metrics, null, 2)}`;
  const resp = await callLLM(
    [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }],
    'groq',
    'llama-3.3-70b-versatile'
  );

  return resp.content;
}

async function collectMetrics(dateStr: string): Promise<DailyMetrics> {
  // Placeholder — read from DB metrics/budget tables
  // For now return demo data
  return {
    date: dateStr,
    revenue: { today: 12450, change: 8.2 },
    leads: { newToday: 47, qualified: 12, pipelineValue: 280000 },
    emails: { sent: 312, opened: 41, clicked: 12 },
    system: { errors24h: 2, buildStatus: 'ok', uptime: 99.8 },
    founder: { deepWorkHours: 4.5, decisionsMade: 18, energyScore: 7 },
    topOpportunity: 'Enterprise pilot with TechCorp could generate $450k ARR if closed this week',
    biggestRisk: 'Onboarding churn increased 12% this week — risk of $180k ARR loss if not fixed',
  };
}

// WEEKLY WAR REPORT
export async function generateWeeklyReport(): Promise<string> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const systemPrompt = `You are the Founder's AGI War Room. Generate a WEEKLY WAR REPORT.

Format:
🎯 WEEKLY WAR REPORT — ${weekAgo.toISOString().slice(0, 10)} → ${now.toISOString().slice(0, 10)}

STRATEGIC WINS
• [3-5 bullet points]

STRATEGIC FAILURES
• [what didn't work, why]

MONEY LEAKS
• [wasted spend, inefficient channels]

HIRING PRIORITIES
• [roles to add/fire]

CHURN RISKS
• [at-risk accounts, root causes]

MARKET ATTACKS
• [competitor moves, counter-strikes]

EXPANSION OPPORTUNITIES
• [adjacent markets, acquisition targets]

FOUNDER PERFORMANCE
• [what went well, what to improve]

NEXT WEEK’S BATTLE PLAN
• [top 3 priorities only]`;

  const resp = await callLLM([{ role: 'system', content: systemPrompt }], 'groq');
  return resp.content;
}
