// Telegram Dispatcher — routes AGI alerts to founder’s Telegram
// This module is called by the AGI orchestrator when Telegram output is needed.

import { message } from '../message'; // OpenClaw message tool would be called from session context

export interface TelegramAlert {
  text: string;
  priority: number; // 1-100
  category?: 'revenue' | 'system' | 'competitor' | 'founder' | 'growth' | 'urgent';
  requireAcknowledgement?: boolean;
  buttons?: Array<{ label: string; callback: string }>;
}

// Determine if alert should bypassquiet hours etc.
export function shouldBypass(priority: number): boolean {
  return priority >= 90; // critical + high always go through
}

// Format final Telegram message with optional rich UI
export function formatForTelegram(alert: TelegramAlert): string {
  let out = alert.text;

  // Auto-categorize with emoji prefix if not present
  if (!out.startsWith('🚨') && !out.startsWith('⚠️') && !out.startsWith('ℹ️')) {
    const emoji = alert.priority >= 95 ? '🚨' : alert.priority >= 90 ? '⚠️' : '📊';
    out = `${emoji} ${out}`;
  }

  // Add footer with timestamp
  const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  out += `\n\n[${ts}]`;

  return out;
}

// Send alert via OpenClaw message tool (will be invoked from session context)
export async function sendTelegramAlert(alert: TelegramAlert, chatId?: string): Promise<boolean> {
  const formatted = formatForTelegram(alert);

  // In real implementation, use OpenClaw message tool with chatId from session
  // Here we return true assuming the caller will dispatch
  console.log(`[TELEGRAM OUT] ${formatted}`);
  return true;
}

// Batch multiple alerts into a single digest
export function createDigest(alerts: TelegramAlert[]): string {
  const critical = alerts.filter(a => a.priority >= 95);
  const high = alerts.filter(a => a.priority >= 90 && a.priority < 95);
  const medium = alerts.filter(a => a.priority >= 75 && a.priority < 90);

  let digest = '';

  if (critical.length) {
    digest += '🚨 CRITICAL ALERTS\n';
    critical.forEach(a => digest += `• ${a.text.split('\n')[0]}\n`);
    digest += '\n';
  }

  if (high.length) {
    digest += '⚠️ HIGH PRIORITY\n';
    high.forEach(a => digest += `• ${a.text.split('\n')[0]}\n`);
    digest += '\n';
  }

  if (medium.length) {
    digest += '📊 STRATEGIC UPDATE\n';
    medium.forEach(a => digest += `• ${a.text.split('\n')[0]}\n`);
  }

  return digest || '✅ All systems operating normally.';
}
