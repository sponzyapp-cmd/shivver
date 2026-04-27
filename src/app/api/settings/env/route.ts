import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse, stringify } from 'dotenv';

// Turbopack: path.join with process.cwd() is safe — cwd is static for Next.js servers
const ENV_PATH = path.join(process.cwd() /*turbopackIgnore: true*/, '.env.local');
const EXAMPLE_PATH = path.join(process.cwd() /*turbopackIgnore: true*/, '.env.example');

// GET /api/settings/env — return env vars (mask secrets)
export async function GET() {
  const env = parse(fs.readFileSync(ENV_PATH, 'utf-8'));
  const masked: Record<string, string> = {};

  const secretKeys = ['API_KEY', 'SECRET', 'TOKEN', 'PASSWORD'];
  for (const [key, value] of Object.entries(env)) {
    if (secretKeys.some(s => key.toUpperCase().includes(s))) {
      masked[key] = '••••••••';
    } else {
      masked[key] = value;
    }
  }

  return NextResponse.json({ env: masked });
}

// PATCH /api/settings/env — update one or many env vars
// Accepts: { key, value } OR { KEY1: val1, KEY2: val2, ... }
export async function PATCH(req: NextRequest) {
  const body = await req.json();

  let updates: Record<string, string>;
  if (body.key && body.value !== undefined) {
    // Single key update (legacy)
    updates = { [body.key]: body.value };
  } else {
    // Bulk update
    updates = body;
  }

  const env = parse(fs.readFileSync(ENV_PATH, 'utf-8'));

  for (const [key, value] of Object.entries(updates)) {
    if (typeof key === 'string' && key.trim()) {
      env[key] = (value as string) ?? '';
    }
  }

  const content = stringify(env, { excludes: (val) => val === undefined });
  fs.writeFileSync(ENV_PATH, content);

  return NextResponse.json({ success: true, updatedCount: Object.keys(updates).length });
}

// POST /api/settings/env/reset — reset to defaults (from .env.example)
export async function POST(req: NextRequest) {
  if (fs.existsSync(EXAMPLE_PATH)) {
    fs.copyFileSync(EXAMPLE_PATH, ENV_PATH);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: 'No .env.example found' }, { status: 404 });
}
