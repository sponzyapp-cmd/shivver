import { trackUserAction } from '@/lib/brain-tracker';
import { NextRequest, NextResponse } from 'next/server';

// Brain tracking middleware — logs all chat & tool activity
export async function withBrainTracking(
  handler: (req: NextRequest, userId?: number) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    // Get user (demo: always 1; later from session)
    const userId = 1;

    // Call original handler
    const response = await handler(req, userId);

    // Track inbound/outbound messages asynchronously (don't block response)
    if (req.url.includes('/api/chat')) {
      try {
        const body = await req.clone().json();
        if (body?.messages) {
          const lastMsg = body.messages[body.messages.length - 1];
          if (lastMsg?.role === 'user') {
            trackUserAction({
              type: 'message_sent',
              content: lastMsg.content,
              channel: 'web',
              timestamp: new Date(),
            });
          }
        }
      } catch {
        // ignore — tracking is best-effort
      }
    }

    return response;
  };
}

// Helper: track tool execution (call from agent-engine)
export function trackToolExecution(
  tool: string,
  params: Record<string, any>,
  duration: number,
  success: boolean
) {
  trackUserAction({
    type: 'tool_used',
    tool,
    params,
    duration,
    success,
    timestamp: new Date(),
  });
}

// Helper: track computer action
export function trackComputerAction(
  action: string,
  params: Record<string, any>,
  success: boolean
) {
  trackUserAction({
    type: 'computer_action',
    action,
    params,
    success,
    timestamp: new Date(),
  });
}

// Helper: track voice interactions
export function trackVoiceInput(duration: number, transcript: string) {
  trackUserAction({
    type: 'voice_input',
    duration,
    transcript,
    timestamp: new Date(),
  });
}

export function trackVoiceOutput(duration: number, audioUrl: string) {
  trackUserAction({
    type: 'voice_output',
    duration,
    audioUrl,
    timestamp: new Date(),
  });
}
