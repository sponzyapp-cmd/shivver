import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/platform';

// GET /api/settings/export — download full backup JSON
export async function GET() {
  const cfg = getConfig();
  // Also include brain graph
  const brainRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/brain/graph`);
  const brain = await brainRes.json();

  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    config: {
      mode: cfg.mode,
      dataDir: cfg.dataDir,
      dbPath: cfg.dbPath,
      storageDir: cfg.storageDir,
      syncIntervalMinutes: cfg.syncIntervalMinutes,
      cloudOnly: cfg.cloudOnly,
    },
    brain,
  };

  const json = JSON.stringify(backup, null, 2);
  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="shivver-backup-${new Date().toISOString().slice(0,10)}.json"`,
    },
  });
}
