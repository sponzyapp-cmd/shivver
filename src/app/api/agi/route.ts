// AGI Main Endpoint — GET status, POST command
// GET  /api/agi → system status
// POST /api/agi → founder command { command: "..." }

import { NextRequest, NextResponse } from 'next/server';
import { processEvent } from '@/lib/agi/orchestrator';
import { AGENTS } from '@/lib/agi/agents';
import { db, users } from '@/lib/db';

// GET /api/agi — system health + agent statuses
export async function GET() {
  try {
    const health = { database: 'unknown', agents: AGENTS.length, uptime: process.uptime() };

    try {
      await db.select().from(users).limit(1);
      health.database = 'connected';
    } catch (err: any) {
      console.error('[AGI GET] DB health check failed:', err.message, err.stack);
      health.database = 'error';
      health.dbError = err.message;
    }

    return NextResponse.json({
      ...health,
      agents: AGENTS.map(a => ({ id: a.id, name: a.name, priority: a.priority, frequency: a.frequency })),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/agi — direct founder command from Telegram or UI
export async function POST(req: NextRequest) {
  try {
    const { command } = await req.json();
    if (!command || typeof command !== 'string') {
      return NextResponse.json({ error: 'command field required' }, { status: 400 });
    }

    // Create a user_command event
    const event = {
      type: 'user_command',
      payload: { command, receivedAt: new Date().toISOString() },
      timestamp: new Date(),
      source: 'telegram',
      severity: 'high',
    };

    const results = await processEvent(event);

    // Collect all agent responses
    const responses: Array<{ agent: string; output: any; alerts: string[] }> = [];
    for (const result of results) {
      responses.push({
        agent: result.agentId,
        output: result.output,
        alerts: result.telegramMessages.map(m => m.text),
      });
    }

    return NextResponse.json({
      success: true,
      command,
      responses,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
