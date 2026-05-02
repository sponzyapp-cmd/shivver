import { NextRequest, NextResponse } from 'next/server';
import { db, messages, user_actions, sessions, tool_executions } from '@/lib/db';
import { sql, desc } from 'drizzle-orm';

// GET /api/stats — user behavior statistics for dashboard
export async function GET(req: NextRequest) {
  try {
    const userId = 1; // TODO: real session user

    // Total messages
    const sessionSub = db.select({ id: sessions.id }).from(sessions).where(sql`${sessions.userId} = ${userId}`);
    const [messageCount] = await db.select({ count: sql<number>`count(*)` }).from(messages)
      .where(sql`${messages.sessionId} = any(${sessionSub})`);

    // Total tools used
    const [toolExecCount] = await db.select({ count: sql<number>`count(*)` }).from(tool_executions)
      .where(sql`exists (
        select 1 from agent_executions ae
        join sessions s on s.id = ae.session_id
        where s.user_id = ${userId}
        and agent_executions.id = tool_executions.agent_execution_id
      )`);

    // Session lengths
    const sessionsList = await db.select({
      createdAt: sessions.createdAt,
      lastActivityAt: sessions.lastActivityAt,
    }).from(sessions)
      .where(sql`${sessions.userId} = ${userId}`)
      .orderBy(desc(sessions.createdAt))
      .limit(100);

    const avgSessionMins = sessionsList.length > 0
      ? sessionsList.reduce((acc, s) => {
          const start = new Date(s.createdAt).getTime();
          const end = new Date(s.lastActivityAt).getTime();
          return acc + (end - start) / 1000 / 60;
        }, 0) / sessionsList.length
      : 0;

    // Active hours distribution (from user_brains table)
    const [brain] = await db.select({ activeHours: user_actions.type }).from(user_actions)
      .where(sql`${user_actions.userId} = ${userId} and ${user_actions.type} = 'message_sent'`);
    // For now, mock active hours; we'll compute from timestamp later

    // Communication style metrics
    const recentMsgs = await db.select({
      content: messages.content,
      direction: messages.direction,
    }).from(messages)
      .where(sql`${messages.sessionId} = any(${sessionSub})`)
      .orderBy(desc(messages.createdAt))
      .limit(200);

    const userMsgs = recentMsgs.filter(m => m.direction === 'inbound');
    const avgLength = userMsgs.length > 0
      ? userMsgs.reduce((sum, m) => sum + m.content.length, 0) / userMsgs.length
      : 0;

    const emojiCount = userMsgs.reduce((sum, m) =>
      sum + (m.content.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu) || []).length, 0);
    const emojiRate = userMsgs.length > 0 ? emojiCount / userMsgs.length : 0;

    const questionCount = userMsgs.reduce((sum, m) => sum + (m.content.includes('?') ? 1 : 0), 0);
    const questionRatio = userMsgs.length > 0 ? questionCount / userMsgs.length : 0;

    // Formality: lowercase ratio, absence of emojis, formal phrases
    const formalIndicators = ['please', 'thank you', 'kindly', 'would you', 'could you'];
    const informalIndicators = ['hey', 'yo', 'sup', 'thanks!'];
    const formalCount = userMsgs.filter(m => formalIndicators.some(f => m.content.toLowerCase().includes(f))).length;
    const informalCount = userMsgs.filter(m => informalIndicators.some(i => m.content.toLowerCase().includes(i))).length;
    const formality = userMsgs.length > 0
      ? Math.max(0, Math.min(1, 0.5 + (formalCount - informalCount) / (userMsgs.length * 2)))
      : 0.5;

    return NextResponse.json({
      totalMessages: messageCount?.count || 0,
      totalToolsUsed: toolExecCount?.count || 0,
      avgSessionLength: avgSessionMins,
      activeHours: Array(24).fill(0), // TODO: compute from user_actions timestamp GROUP BY HOUR()
      topChannels: [{ channel: 'web', count: messageCount?.count || 0 }],
      topTools: [], // grouped from tool_executions
      communicationStyle: {
        avgLength: Math.round(avgLength),
        formality,
        emojiRate,
        questionRatio,
      },
    });
  } catch (err) {
    console.error('Stats error:', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
