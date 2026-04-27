import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { getConfig, saveConfig } from '@/lib/platform';

// POST /api/settings/import — upload backup JSON and restore
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const text = await file.text();
    const backup = JSON.parse(text);

    // Restore config (partial merge)
    if (backup.config) {
      saveConfig({
        mode: backup.config.mode,
        dataDir: backup.config.dataDir,
        dbPath: backup.config.dbPath,
        storageDir: backup.config.storageDir,
        syncIntervalMinutes: backup.config.syncIntervalMinutes,
        cloudOnly: backup.config.cloudOnly,
      });
    }

    // Restore brain graph — insert nodes/connections into DB
    if (backup.brain) {
      // TODO: merge brain.nodes and brain.connections into DB tables
      // For now, just placeholder
    }

    return NextResponse.json({ success: true, message: 'Settings imported' });
  } catch (err: any) {
    console.error('Import error:', err);
    return NextResponse.json({ error: 'Invalid backup file' }, { status: 400 });
  }
}
