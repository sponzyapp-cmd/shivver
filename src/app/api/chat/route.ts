import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions, messages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';
import { openai, streamChat } from '@/lib/openai';
import { trackMessageSent, trackMessageReceived } from '@/lib/brain-tracker';

const SYSTEM_PROMPT = `You are Shivver, a helpful AI assistant. Be concise, friendly, and competent.`;

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    let sessionToken = cookieStore.get('shivver_session')?.value;

    // Get or create session
    let session;
    if (!sessionToken) {
      sessionToken = nanoid(21);
      const [newSession] = await db.insert(sessions).values({
        userId: 1,
        provider: 'web',
        providerSessionId: sessionToken,
        state: {},
        metadata: {},
      }).returning();
      session = newSession;
    } else {
      session = await db.query.sessions.findFirst({
        where: eq(sessions.providerSessionId, sessionToken),
      });
      if (!session) {
        const [newSession] = await db.insert(sessions).values({
          userId: 1,
          provider: 'web',
          providerSessionId: sessionToken,
          state: {},
          metadata: {},
        }).returning();
        session = newSession;
      }
    }

    // Save user message
    await db.insert(messages).values({
      sessionId: session.id,
      direction: 'inbound',
      contentType: 'text',
      content: message,
      processingState: 'queued',
    });

    // Track brain: user sent message (fire-and-forget, don't block)
    trackMessageSent(message, 'web');

    // Get history
    const history = await db.query.messages.findMany({
      where: eq(messages.sessionId, session.id),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      limit: 40,
    });

    const openaiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map(m => ({
        role: m.direction === 'inbound' ? 'user' : 'assistant',
        content: m.content,
      })),
    ];

    // Stream response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let full = '';
        try {
          await streamChat(openaiMessages, chunk => {
            full += chunk;
            controller.enqueue(encoder.encode(chunk));
          });

          // Save assistant message
          await db.insert(messages).values({
            sessionId: session.id,
            direction: 'outbound',
            contentType: 'text',
            content: full,
            processingState: 'delivered',
            deliveredAt: new Date(),
          });

          // Track brain: assistant replied
          trackMessageReceived(full, 'web');

          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    const response = new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });

    if (!cookieStore.get('shivver_session')) {
      response.headers.append(
        'Set-Cookie',
        `shivver_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}` +
          (process.env.NODE_ENV === 'production' ? '; Secure' : '')
      );
    }

    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
