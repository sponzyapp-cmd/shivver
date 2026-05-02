import {divineProcess, getDivineState, processEvent} from '@/lib/agi/orchestrator';
import {NextRequest, NextResponse} from 'next/server';

// POST /api/agi/divine - Talk to the Divine AGI
export async function POST(req: NextRequest) {
  const {input} = await req.json();

  if (!input) {
    return NextResponse.json({error: 'Input required'}, {status: 400});
  }

  const response = await divineProcess(input);
  const state = getDivineState();

  return NextResponse.json({
    response,
    divineState: state,
    timestamp: new Date().toISOString(),
  });
}

// GET /api/agi/state - Get current divine state
export async function GET() {
  const state = getDivineState();
  return NextResponse.json({
    ...state,
    message: `🌟 Divine AGI Online - Level: ${state.divineLevel}`,
  });
}