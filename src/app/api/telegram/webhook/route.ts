import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm-provider';

// POST /api/telegram/webhook - Telegram bot webhook for 2-way chat
export async function POST(req: NextRequest) {
  const body = await req.json();
  
  // Telegram webhook format
  const message = body.message;
  if (!message || !message.text) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id;
  const text = message.text;

  // Process with AGI
  try {
    const response = await callLLM(
      [
        { role: 'system', content: 'You are Shivver AGI, a helpful assistant. Keep responses concise.' },
        { role: 'user', content: text },
      ],
      'groq',
      'llama-3.3-70b-versatile'
    );

    // Send response back to Telegram
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    if (telegramToken) {
      await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: response.content,
          parse_mode: 'Markdown',
        }),
      });
    }
  } catch (error) {
    console.error('[Telegram] Error:', error);
  }

  return NextResponse.json({ ok: true });
}

// GET /api/telegram/webhook - Set webhook
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;

  if (action === 'set-webhook') {
    const webhookUrl = url.searchParams.get('url');
    if (!webhookUrl || !telegramToken) {
      return NextResponse.json({ error: 'Missing url or token' }, { status: 400 });
    }
    
    const res = await fetch(`https://api.telegram.org/bot${telegramToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    });
    
    const data = await res.json();
    return NextResponse.json(data);
  }

  return NextResponse.json({ ok: true, hint: 'Use ?action=set-webhook&url=YOUR_WEBHOOK_URL' });
}