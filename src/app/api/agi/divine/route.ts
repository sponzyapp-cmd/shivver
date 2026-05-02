import {processEvent, getAGIState} from '@/lib/agi/orchestrator';
import {NextRequest, NextResponse} from 'next/server';

// POST /api/agi/chat - Talk to the AGI
export async function POST(req: NextRequest) {
  const {input} = await req.json();

  if (!input) {
    return NextResponse.json({error: 'Input required'}, {status: 400});
  }

  const event = {
    type: 'user_command',
    payload: { command: input },
    timestamp: new Date(),
    source: 'user' as const,
  };

  const results = await processEvent(event);
  const state = getAGIState();

  return NextResponse.json({
    results,
    agiState: state,
    timestamp: new Date().toISOString(),
  });
}

// GET /api/agi/state - Get current AGI state
export async function GET() {
  const state = getAGIState();
  return NextResponse.json({
    ...state,
    message: `🧠 AGI Online - Level: ${state.intelligenceLevel}`,
  });
}