import { NextRequest, NextResponse } from 'next/server';
import cron from 'node-cron';
import { collectEvents } from '@/lib/agi/event-collector';
import { processEvent } from '@/lib/agi/orchestrator';

// Local AGI scheduler (for computer/terminal mode)
let cronJob: any = null;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  if (action === 'start') {
    if (cronJob) {
      return NextResponse.json({ success: true, message: 'AGI already running', status: 'active' });
    }

    // Run every hour
    cronJob = cron.schedule('0 * * * *', async () => {
      console.log('[AGI LOCAL] Running hourly scan...');
      try {
        const events = await collectEvents();
        for (const event of events) {
          await processEvent(event);
        }
        console.log(`[AGI LOCAL] Processed ${events.length} events`);
      } catch (e) {
        console.error('[AGI LOCAL] Error:', e);
      }
    });

    // Also run immediately
    setTimeout(async () => {
      const events = await collectEvents();
      for (const event of events) {
        await processEvent(event);
      }
    }, 2000);

    return NextResponse.json({ success: true, message: 'AGI scheduler started (hourly)', status: 'active' });
  }

  if (action === 'stop') {
    if (cronJob) {
      cronJob.stop();
      cronJob = null;
    }
    return NextResponse.json({ success: true, message: 'AGI scheduler stopped', status: 'inactive' });
  }

  if (action === 'status') {
    return NextResponse.json({ 
      success: true, 
      status: cronJob ? 'active' : 'inactive',
      schedule: '0 * * * * (hourly)'
    });
  }

  // Default: run once
  const events = await collectEvents();
  let results = 0;
  for (const event of events) {
    await processEvent(event);
    results++;
  }

  return NextResponse.json({ success: true, processed: results });
}