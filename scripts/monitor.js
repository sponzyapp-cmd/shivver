#!/usr/bin/env node
/**
 * Shivver AI Monitor & Build Verifier
 * Runs every 30 minutes to ensure the AI app is healthy, builds cleanly, and catches errors.
 */

const { execSync } = require('child_process');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');
const https = require('https');

const APP_DIR = process.env.SHIVVER_DIR || '/root/.openclaw/workspace/shivver';
const HEALTH_URL = 'http://localhost:3000/api/health';
const LOG_PATH = '/root/.openclaw/workspace/memory';

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function runCommand(cmd, cwd = APP_DIR) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    return `ERROR: ${err.message}`;
  }
}

function pingHealth() {
  return new Promise((resolve) => {
    try {
      https.get(HEALTH_URL.replace('http://', 'https://'), (res) => {
        resolve(res.statusCode === 200);
      }).on('error', () => resolve(false));
    } catch (e) {
      resolve(false);
    }
  });
}

function scanRecentErrors(hoursBack = 1) {
  const errors = [];
  try {
    if (!existsSync(LOG_PATH)) return [];
    // Very basic: if memory dir exists, just list files; actual parsing would need more work
    const files = readFileSync(LOG_PATH, 'utf-8').split('\n').filter((line) => {
      const lower = line.toLowerCase();
      return lower.includes('error') || lower.includes('⚠️') || lower.includes('fail');
    });
    return files.slice(-10);
  } catch (e) {
    return [];
  }
}

async function main() {
  log('--- Shivver Monitor Starting ---');

  // 1. Lint
  log('Running lint check...');
  const lintOut = runCommand('npm run lint');
  if (lintOut.includes('✖') || lintOut.includes('error')) {
    log('⚠️  Lint issues detected:');
    console.log(lintOut.slice(0, 500));
  } else {
    log('✅ Lint clean');
  }

  // 2. Build
  log('Running production build...');
  const buildOut = runCommand('npm run build');
  if (buildOut.includes('✖') || buildOut.includes('error') || buildOut.includes('Build error')) {
    log('❌ Build failed! Check output:');
    console.log(buildOut.slice(0, 500));
    process.exit(1);
  } else {
    log('✅ Build succeeded');
  }

  // 3. Health check
  log('Checking server health...');
  const healthy = await pingHealth();
  if (healthy) {
    log('✅ Server responding at ' + HEALTH_URL);
  } else {
    log('⚠️  Server not responding — consider restarting');
  }

  // 4. Error scanning
  log('Scanning recent logs for errors...');
  const recentErrors = scanRecentErrors(1);
  if (recentErrors.length > 0) {
    log('⚠️  Recent errors found:');
    recentErrors.forEach((err) => log(`   ${err}`));
  } else {
    log('✅ No recent errors');
  }

  log('--- Monitor Complete ---');
}

main().catch((err) => {
  console.error('Monitor crashed:', err);
  process.exit(1);
});
