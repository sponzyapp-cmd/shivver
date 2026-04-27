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

// PATCH /api/settings/env — update specific env var
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { key, value } = body;

  if (!key || typeof key !== 'string') {
    return NextResponse.json({ error: 'Key required' }, { status: 400 });
  }

  const env = parse(fs.readFileSync(ENV_PATH, 'utf-8'));
  env[key] = value || '';
  const content = stringify(env, { excludes: (val) => val === undefined });

  fs.writeFileSync(ENV_PATH, content);

  return NextResponse.json({ success: true, key, value: '••••••••'.includes(value) ? '***' : value });
}

// POST /api/settings/env/reset — reset to defaults (from .env.example)
export async function POST(req: NextRequest) {
  if (fs.existsSync(EXAMPLE_PATH)) {
    fs.copyFileSync(EXAMPLE_PATH, ENV_PATH);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: 'No .env.example found' }, { status: 404 });
}
