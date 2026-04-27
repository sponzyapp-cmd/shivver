import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions, messages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('shivver_session')?.value;

  if (!sessionToken) {
    return NextResponse.json({ messages: [] });
  }

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.providerSessionId, sessionToken),
  });

  if (!session) {
    return NextResponse.json({ messages: [] });
  }

  const msgs = await db.query.messages.findMany({
    where: eq(messages.sessionId, session.id),
    orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    limit: 200,
  });

  return NextResponse.json({
    messages: msgs.map(m => ({
      id: String(m.id),
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.content,
      timestamp: m.createdAt,
    })),
  });
}
