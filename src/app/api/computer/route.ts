import { NextRequest, NextResponse } from 'next/server';
import { executeComputerAction, enableDesktopAgent } from '@/lib/computer-tool';

// Initialize desktop agent mode if configured
if (process.env.DESKTOP_AGENT_URL) {
  enableDesktopAgent(process.env.DESKTOP_AGENT_URL);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...params } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const result = await executeComputerAction({
      action: action as any,
      ...params,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Computer action error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
