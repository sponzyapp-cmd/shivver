import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { agent_executions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

// GET /api/cron/run — combined daily cron (agent-poll + deliver)
// Vercel Hobby: only 1 cron allowed per day, so we batch tasks here
export async function GET(req: NextRequest) {
  try {
    // 1. Agent poll — process queued agent executions
    const pending = await db
      .select()
      .from(agent_executions)
      .where(sql`${agent_executions.completedAt} IS NULL`)
      .limit(10);

    let polled = 0;
    for (const exec of pending) {
      // In full implementation, would re-queue agent run
      // For now, just mark as completed to clear queue
      await db
        .update(agent_executions)
        .set({ completedAt: new Date(), error: 'Cron processed' })
        .where(eq(agent_executions.id, exec.id));
      polled++;
    }

    // 2. Deliver — mark queued messages as delivered (no-op for now)
    // In full version: process outbound message queue
    const delivered = 0; // placeholder

    return NextResponse.json({
      success: true,
      tasks: ['agent-poll', 'deliver'],
      agentExecutionsProcessed: polled,
      messagesDelivered: delivered,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Cron error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
