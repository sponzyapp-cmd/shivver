import { NextRequest, NextResponse } from 'next/server';
import { db, sessions, messages, tool_executions, agent_executions } from '@/lib/db';
import { sql, desc, count } from 'drizzle-orm';

// GET /api/stats/full — aggregated stats for dashboard
export async function GET() {
  try {
    // Counts
    const [sessionsRes] = await db.select({ count: count() }).from(sessions);
    const [messagesRes] = await db.select({ count: count() }).from(messages);
    const [toolsRes] = await db.select({ count: count() }).from(tool_executions);

    // Tokens sum from agent_executions
    const tokensSum = await db
      .select({ sum: sql<number>`COALESCE(SUM(tokens_used), 0)` })
      .from(agent_executions);
    const totalTokens = tokensSum[0]?.sum || 0;

    // Cost sum (JSONB total field) — Postgres
    const costSum = await db
      .select({ sum: sql<number>`COALESCE(SUM((cost->>'total')::float), 0)` })
      .from(agent_executions);
    const totalCost = costSum[0]?.sum || 0;

    // Recent sessions with message counts
    const recentSessions = await db
      .select({
        id: sessions.id,
        createdAt: sessions.createdAt,
        lastActivityAt: sessions.lastActivityAt,
        msgCount: count(messages).as('msgCount'),
      })
      .from(sessions)
      .leftJoin(messages, sql`${messages.sessionId} = ${sessions.id}`)
      .groupBy(sessions.id, sessions.createdAt, sessions.lastActivityAt)
      .orderBy(desc(sessions.createdAt))
      .limit(10);

    const formattedSessions = recentSessions.map(s => ({
      id: s.id,
      startedAt: s.createdAt.toISOString(),
      messagesCount: Number(s.msgCount) || 0,
      durationMin: Math.max(0, (new Date(s.lastActivityAt).getTime() - new Date(s.createdAt).getTime()) / 1000 / 60),
    }));

    // Messages per day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const msgsByDay = await db
      .select({
        day: sql<Date>`DATE(created_at)`,
        cnt: count(),
      })
      .from(messages)
      .where(sql`${messages.createdAt} >= ${thirtyDaysAgo}`)
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`);

    // Top tools (from tool_executions, group by tool_name)
    const topTools = await db
      .select({
        tool: sql<number>`tool_id::text`, // simplified; needs join with tools table
        cnt: count(),
      })
      .from(tool_executions)
      .groupBy(sql`tool_id`)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(5);

    return NextResponse.json({
      totalMessages: Number(messagesRes?.count || 0),
      totalSessions: Number(sessionsRes?.count || 0),
      totalToolRuns: Number(toolsRes?.count || 0),
      totalTokens,
      totalCostUSD: totalCost,
      avgSessionLength: 0, // compute from recentSessions if needed
      messagesByDay: msgsByDay.map(m => ({
        date: m.day.toISOString().slice(0, 10),
        count: Number(m.cnt),
      })),
      topTools: topTools.map(t => ({ tool: `tool-${t.tool}`, count: Number(t.cnt) })),
      recentSessions: formattedSessions,
    });
  } catch (err: any) {
    console.error('Stats error:', err);
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
