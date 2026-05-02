#!/usr/bin/env node
// Run AGI once - useful for local/computer mode

async function runAGI() {
  const { collectEvents } = require('./src/lib/agi/event-collector');
  const { processEvent } = require('./src/lib/agi/orchestrator');

  console.log('[AGI] Starting autonomous scan...');
  
  try {
    const events = await collectEvents();
    console.log(`[AGI] Collected ${events.length} events`);
    
    for (const event of events) {
      console.log(`[AGI] Processing ${event.type}...`);
      await processEvent(event);
    }
    
    console.log('[AGI] Cycle complete');
  } catch (error) {
    console.error('[AGI] Error:', error.message);
    process.exit(1);
  }
}

runAGI();