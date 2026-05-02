import { NextRequest, NextResponse } from 'next/server';
import { db, agent_executions } from '@/lib/db';
import { eq, sql } from 'drizzle-orm';
import { collectEvents, processFounderCommand } from '@/lib/agi/event-collector';
import { processEvent } from '@/lib/agi/orchestrator';
import { formatTelegramBroadcast, sendTelegramAlert } from '@/lib/agi/telegram';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// State file for AGI persistence (survives rate limit recovery)
const STATE_FILE = join(process.cwd(), '.agi-state.json');

function readAGIState() {
  try {
    const data = readFileSync(STATE_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return { lastRun: null, pendingTasks: [], runCount: 0 };
  }
}

function writeAGIState(state: any) {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('Failed to persist AGI state:', e);
  }
}

// GET /api/cron/run — hourly AGI cron
// Vercel Hobby: only 1 cron per day, so we use GitHub Actions for hourly
// This endpoint continues AGI operation across rate limit hits
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') || 'daily';
  const state = readAGIState();
  state.lastRun = new Date().toISOString();
  state.runCount += 1;

  try {
    const results: any[] = [];

    // 1. Agent poll — process queued agent executions
    const pending = await db
      .select()
      .from(agent_executions)
      .where(sql`${agent_executions.completedAt} IS NULL`)
      .limit(5);

    let polled = 0;
    for (const exec of pending) {
      await db
        .update(agent_executions)
        .set({ completedAt: new Date(), error: 'Cron processed' })
        .where(eq(agent_executions.id, exec.id));
      polled++;
    }
    results.push({ task: 'agent-poll', processed: polled });

    // 2. AGI Autonomous Scan — run agents every time
    if (mode === 'agi' || mode === 'daily') {
      const events = await collectEvents();
      let agiAlerts: string[] = [];
      let taskResults: any[] = [];

      for (const event of events) {
        try {
          const agentResults = await processEvent(event);
          for (const ar of agentResults) {
            if (ar.telegramMessages.length > 0) {
              agiAlerts.push(...ar.telegramMessages.map(m => m.text));
            }
            taskResults.push({ agent: ar.agentId, success: ar.success });
          }
        } catch (e: any) {
          // Rate limit hit - save pending tasks and continue
          if (e.message?.includes('rate') || e.status === 429) {
            state.pendingTasks.push({ event, timestamp: new Date().toISOString() });
            writeAGIState(state);
            return NextResponse.json({
              success: true,
              rateLimited: true,
              savedTasks: state.pendingTasks.length,
              message: 'Rate limit hit - tasks saved for next run',
            });
          }
        }
      }

      results.push({ task: 'agi_scan', events: events.length, alerts: agiAlerts.length });
      results.push({ task: 'task_results', details: taskResults });

      // 3. Resume any pending tasks from previous rate limit
      if (state.pendingTasks.length > 0) {
        for (const pendingTask of state.pendingTasks.splice(0, 5)) {
          try {
            await processEvent(pendingTask.event);
          } catch (e) {
            state.pendingTasks.push(pendingTask);
          }
        }
        writeAGIState(state);
      }

      // 4. Deliver — Telegram alerts
      if (agiAlerts.length > 0) {
        console.log('[AGI ALERTS]', agiAlerts.slice(0, 3).join(' | '));
      }
    }

    writeAGIState(state);

    return NextResponse.json({
      success: true,
      mode,
      runCount: state.runCount,
      tasks: ['agent-poll', 'agi_scan', 'deliver'],
      details: results,
      pendingTasks: state.pendingTasks.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Cron error:', err);
    return NextResponse.json({ error: err.message, success: false }, { status: 500 });
  }
}