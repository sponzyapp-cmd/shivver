'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// Types
type UserAction =
  | { type: 'message_sent'; content: string; channel: string; timestamp: Date }
  | { type: 'message_received'; content: string; channel: string; timestamp: Date }
  | { type: 'tool_used'; tool: string; params: Record<string, any>; duration: number; success: boolean; timestamp: Date }
  | { type: 'voice_input'; duration: number; transcript: string; timestamp: Date }
  | { type: 'voice_output'; duration: number; audioUrl: string; timestamp: Date }
  | { type: 'computer_action'; action: string; params: Record<string, any>; success: boolean; timestamp: Date }
  | { type: 'page_view'; path: string; search: string; timestamp: Date };

const USER_ID = 1; // demo user (replace with session later)

let actionQueue: UserAction[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

async function flushActions() {
  if (actionQueue.length === 0) return;
  const actions = [...actionQueue];
  actionQueue = [];

  try {
    await fetch('/api/brain/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: USER_ID, actions }),
    });
  } catch {
    // ignore — best-effort
    actionQueue.unshift(...actions); // retry later
  }
}

function scheduleFlush() {
  if (flushTimeout) clearTimeout(flushTimeout);
  flushTimeout = setTimeout(flushActions, 3000);
}

// Public API
export function trackUserAction(action: UserAction) {
  actionQueue.push(action);
  scheduleFlush();
}

export function useBrainTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    trackUserAction({
      type: 'page_view',
      path: pathname,
      search: searchParams?.toString() || '',
      timestamp: new Date(),
    });
  }, [pathname, searchParams]);
}

// High-level helpers
export function trackMessageSent(content: string, channel: string = 'web') {
  trackUserAction({ type: 'message_sent', content, channel, timestamp: new Date() });
}

export function trackMessageReceived(content: string, channel: string = 'web') {
  trackUserAction({ type: 'message_received', content, channel, timestamp: new Date() });
}

export function trackToolUsed(tool: string, params: Record<string, any>, duration: number, success: boolean) {
  trackUserAction({ type: 'tool_used', tool, params, duration, success, timestamp: new Date() });
}

export function trackComputerAction(action: string, params: Record<string, any>, success: boolean) {
  trackUserAction({ type: 'computer_action', action, params, success, timestamp: new Date() });
}

export function trackVoiceInput(duration: number, transcript: string) {
  trackUserAction({ type: 'voice_input', duration, transcript, timestamp: new Date() });
}

export function trackVoiceOutput(duration: number, audioUrl: string) {
  trackUserAction({ type: 'voice_output', duration, audioUrl, timestamp: new Date() });
}
