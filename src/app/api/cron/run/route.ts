import { NextRequest, NextResponse } from 'next/server';
import { db, agent_executions } from '@/lib/db';
import { eq, sql } from 'drizzle-orm';
import { collectEvents, processFounderCommand } from '@/lib/agi/event-collector';
import { processEvent } from '@/lib/agi/orchestrator';
import { formatTelegramBroadcast, sendTelegramAlert } from '@/lib/agi/telegram';

// GET /api/cron/run — combined daily cron (agent-poll + deliver)
// Vercel Hobby: only 1 cron allowed per day, so we batch tasks here
export async function GET(req: NextRequest) {
  try {
    const results: any[] = [];

    // 1. Agent poll — process queued agent executions
    const pending = await db
      .select()
      .from(agent_executions)
      .where(sql`${agent_executions.completedAt} IS NULL`)
      .limit(10);

    let polled = 0;
    for (const exec of pending) {
      await db
        .update(agent_executions)
        .set({ completedAt: new Date(), error: 'Cron processed' })
        .where(eq(agent_executions.id, exec.id));
      polled++;
    }
    results.push({ task: 'agent-poll', processed: polled });

    // 2. AGI Autonomous Scan — collect events and run agents
    const events = await collectEvents();
    let agiAlerts: string[] = [];
    for (const event of events) {
      const agentResults = await processEvent(event);
      for (const ar of agentResults) {
        ar.telegramMessages.forEach(m => agiAlerts.push(m.text));
      }
    }
    results.push({ task: 'agi_scan', events: events.length, alerts: agiAlerts.length });

    // 3. Deliver — push Telegram alerts (simulated in dev, real via OpenClaw message in prod)
    // For now, log to console; in deployment this would call message tool
    if (agiAlerts.length > 0) {
      console.log('[AGI ALERTS]', agiAlerts.join(' | '));
      // TODO: Send to Telegram via OpenClaw message tool
    }

    return NextResponse.json({
      success: true,
      tasks: ['agent-poll', 'agi_scan', 'deliver'],
      details: results,
      agiAlerts: agiAlerts.slice(0, 5), // sample
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Cron error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
