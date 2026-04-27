import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/platform';
import { google } from 'google-auth-library';
import { googleapis } from 'googleapis';

// Helper: exchange code for tokens
async function exchangeCode(code: string) {
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const credentials = Buffer.from(
    `${process.env.GOOGLE_CLIENT_ID}:${process.env.GOOGLE_CLIENT_SECRET}`
  ).toString('base64');

  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });

  if (!resp.ok) {
    throw new Error(`Token exchange failed: ${resp.statusText}`);
  }

  return resp.json();
}

// GET /api/auth/google/callback — OAuth2 redirect handler
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/settings?drive=error', url.origin));
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
  }

  try {
    const tokens = await exchangeCode(code);
    const { refresh_token, access_token, expires_in } = tokens;

    // Store refresh token in user config (for persistent access)
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(getConfigDataDir(), 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8') || '{}');
    config.googleRefreshToken = refresh_token;
    config.googleDriveEnabled = true;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Redirect to settings with success
    return NextResponse.redirect(new URL('/settings?drive=connected', url.origin));
  } catch (err: any) {
    console.error('Google OAuth error:', err);
    return NextResponse.redirect(new URL('/settings?drive=error', url.origin));
  }
}

// Helper to get config dir (duplicate of platform.ts but needed here)
function getConfigDataDir(): string {
  if (process.platform === 'win32') {
    return process.env.APPDATA + '\\Shivver';
  }
  if (process.platform === 'darwin') {
    return `${process.env.HOME}/Library/Application Support/Shivver`;
  }
  return `${process.env.HOME}/.shivver`;
}
