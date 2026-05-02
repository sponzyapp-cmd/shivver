#!/usr/bin/env node
/**
 * Shivver Offline Test Runner
 * Tests SQLite + Ollama offline mode end-to-end
 */

const fetch = require('node-fetch');

const BASE = process.env.SHIVVER_URL || 'http://localhost:3000';
const MODE = process.env.SHIVVER_MODE || 'local';
const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3:70b';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

async function checkOllama() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!res.ok) throw new Error('Ollama not ready');
    const data = await res.json();
    const hasModel = data.models?.some((m: any) => m.name === OLLAMA_MODEL);
    return { ok: true, model: hasModel };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function checkAPI(path: string) {
  try {
    const res = await fetch(`${BASE}${path}`);
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

async function testDBHealth() {
  const r = await checkAPI('/api/agi');
  if (!r.ok) return { pass: false, error: r.error };
  const dbStatus = r.data.database;
  const pass = dbStatus === 'connected';
  return { pass, dbStatus, agents: r.data.agents?.length || 0 };
}

async function testCommand(cmd: string) {
  const res = await fetch(`${BASE}/api/agi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: cmd }),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

async function testLeadFinder() {
  const r = await testCommand('find 2 fintech leads');
  if (!r.ok) return { pass: false, error: r.data?.error || 'HTTP error' };
  const responses = r.data.responses || [];
  const salesResp = responses.find((r: any) => r.agent === 'sales_empire');
  if (!salesResp) return { pass: false, error: 'sales_empire agent did not respond' };
  const result = salesResp.output?.result;
  if (!result) return { pass: false, error: 'no result in output' };
  const count = Array.isArray(result) ? result.length : (result.count || 0);
  return { pass: count >= 2, count, source: result.source || 'unknown' };
}

async function testSendEmail() {
  const r = await testCommand('send test@example.com subject "Hello" body "Test body"');
  if (!r.ok) return { pass: false, error: r.data?.error || 'HTTP error' };
  const resp = r.data.responses?.[0];
  if (!resp) return { pass: false, error: 'no response' };
  const result = resp.output?.result;
  const success = result?.success;
  return { pass: success === true, result };
}

async function testAGIRun() {
  const res = await fetch(`${BASE}/api/agi/run`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) return { pass: false, error: data.error || 'HTTP error' };
  const events = data.events || [];
  return { pass: events.length > 0, eventCount: events.length };
}

async function runAll() {
  log('\n=== Shivver Offline Test Suite ===\n', 'blue');
  const results: any = { passed: 0, failed: 0, tests: [] };

  // 1. Ollama check
  log('1. Checking Ollama...', 'yellow');
  const ollama = await checkOllama();
  if (ollama.ok && ollama.model) {
    log('   ✓ Ollama ready with model', 'green');
    results.passed++;
  } else {
    log(`   ✗ Ollama issue: ${ollama.error || 'model missing'}`, 'red');
    results.failed++;
  }
  results.tests.push({ test: 'ollama', ...ollama });

  // 2. API health
  log('\n2. Checking API health...', 'yellow');
  const health = await checkAPI('/api/agi');
  if (health.ok) {
    log(`   ✓ API responds (${JSON.stringify(health.data).slice(0,80)})`, 'green');
    results.passed++;
  } else {
    log(`   ✗ API error: ${health.error}`, 'red');
    results.failed++;
  }
  results.tests.push({ test: 'api_health', ...health });

  // 3. DB connection
  log('\n3. Checking database...', 'yellow');
  const db = await testDBHealth();
  if (db.pass) {
    log(`   ✓ Database connected (${db.dbStatus}, ${db.agents} agents loaded)`, 'green');
    results.passed++;
  } else {
    log(`   ✗ Database issue: status=${db.dbStatus}`, 'red');
    results.failed++;
  }
  results.tests.push({ test: 'database', ...db });

  // 4. Lead finder
  log('\n4. Testing Lead Finder tool...', 'yellow');
  const leads = await testLeadFinder();
  if (leads.pass) {
    log(`   ✓ Lead finder works (${leads.count} leads, source: ${leads.source})`, 'green');
    results.passed++;
  } else {
    log(`   ✗ Lead finder failed: ${leads.error}`, 'red');
    results.failed++;
  }
  results.tests.push({ test: 'lead_finder', ...leads });

  // 5. Email queue
  log('\n5. Testing Email queue...', 'yellow');
  const email = await testSendEmail();
  if (email.pass) {
    log(`   ✓ Email queued (${JSON.stringify(email.result).slice(0,60)})`, 'green');
    results.passed++;
  } else {
    log(`   ✗ Email failed: ${email.error}`, 'red');
    results.failed++;
  }
  results.tests.push({ test: 'send_email', ...email });

  // 6. AGI autonomous scan
  log('\n6. Testing AGI run (autonomous scan)...', 'yellow');
  const agiRun = await testAGIRun();
  if (agiRun.pass) {
    log(`   ✓ AGI scan executed (${agiRun.eventCount} events)`, 'green');
    results.passed++;
  } else {
    log(`   ✗ AGI run failed: ${agiRun.error}`, 'red');
    results.failed++;
  }
  results.tests.push({ test: 'agi_run', ...agiRun });

  // Summary
  log('\n=== Test Summary ===', 'blue');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Mode: ${MODE}`, 'yellow');
  console.log('\n');

  // Write results to file
  const fs = require('fs');
  const out = {
    timestamp: new Date().toISOString(),
    mode: MODE,
    passed: results.passed,
    failed: results.failed,
    tests: results.tests,
  };
  const logDir = process.env.SHIVVER_LOG_DIR || '~/.shivver/logs';
  const logPath = `${logPath.replace('~', process.env.HOME || '/root')}/test-${new Date().toISOString().slice(0,10)}.json`;
  fs.mkdirSync(logPath.replace(/\/[^/]+$/, ''), { recursive: true });
  fs.writeFileSync(logPath, JSON.stringify(out, null, 2));
  log(`Results saved to ${logPath}`, 'blue');

  process.exit(results.failed > 0 ? 1 : 0);
}

runAll().catch((e) => {
  log(`Fatal error: ${e.message}`, 'red');
  console.error(e);
  process.exit(1);
});
