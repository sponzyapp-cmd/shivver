// AGI Autonomous Run Endpoint — triggered by cron or manual
// POST /api/agi/run — scans all sensors, generates events, processes them, returns alerts

import { NextRequest, NextResponse } from 'next/server';
import { collectEvents } from '@/lib/agi/event-collector';
import { processEvent } from '@/lib/agi/orchestrator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode = 'full', targetAgent } = body;

    // 1. Collect events from all sensors
    const events = await collectEvents();

    // 2. Process each event through agent orchestra
    const allResults = [];
    for (const event of events) {
      const results = await processEvent(event);
      allResults.push(...results);
    }

    // 3. Flatten Telegram messages
    const telegramAlerts: string[] = [];
    for (const result of allResults) {
      result.telegramMessages.forEach(tm => telegramAlerts.push(tm.text));
    }

    // 4. If a specific agent was targeted, run it standalone with latest data
    if (targetAgent) {
      // Re-import AGENTS inline to avoid circular
      const { AGENTS } = await import('@/lib/agi/agents');
      const agent = AGENTS.find(a => a.id === targetAgent);
      if (agent) {
        const syntheticEvent = {
          type: 'manual_trigger',
          payload: { triggeredBy: 'user', timestamp: new Date().toISOString() },
          timestamp: new Date(),
          source: 'api',
          severity: 'high',
        };
        const result = await processEvent(syntheticEvent);
        result.forEach(r => r.telegramMessages.forEach(m => telegramAlerts.push(m.text)));
      }
    }

    return NextResponse.json({
      success: true,
      eventsProcessed: events.length,
      agentsRun: allResults.length,
      alerts: telegramAlerts,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('AGI run error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
