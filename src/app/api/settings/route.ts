import { NextRequest, NextResponse } from 'next/server';
import { getConfig, saveConfig, isLocalMode } from '@/lib/platform';
import { syncToDrive } from '@/lib/platform';

// GET /api/settings — return current config (redact secrets)
export async function GET() {
  const cfg = getConfig();
  const safe = {
    mode: cfg.mode,
    dataDir: cfg.dataDir,
    dbPath: cfg.dbPath,
    storageDir: cfg.storageDir,
    googleDriveEnabled: cfg.googleDriveEnabled,
    syncIntervalMinutes: cfg.syncIntervalMinutes,
    cloudOnly: cfg.cloudOnly,
    // Config status flags
    hasOpenaiKey: Boolean(process.env.OPENAI_API_KEY),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
  };
  return NextResponse.json(safe);
}

// PATCH /api/settings — update config
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const allowed = ['mode', 'syncIntervalMinutes', 'cloudOnly'];
  const updates: Record<string, any> = {};
  allowed.forEach(key => {
    if (body[key] !== undefined) updates[key] = body[key];
  });

  const newConfig = saveConfig(updates);
  return NextResponse.json({ success: true, config: newConfig });
}

// POST /api/settings/sync — trigger Google Drive backup
export async function POST(req: NextRequest) {
  if (!isLocalMode()) {
    return NextResponse.json({ error: 'Sync only available in local mode' }, { status: 400 });
  }

  try {
    // Get brain data
    const brainResp = await (await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/brain/graph`)).json();
    await syncToDrive(getConfig(), brainResp);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
