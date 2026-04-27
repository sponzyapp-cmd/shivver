// Server-side only: config & storage abstraction
// No heavy filesystem ops at module top-level

export type DeploymentMode = 'local' | 'cloud';

export interface ShivverConfig {
  mode: DeploymentMode;
  dataDir: string;
  storageDir: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  googleDriveEnabled?: boolean;
  syncIntervalMinutes: number;
}

export function getConfig(): ShivverConfig {
  const mode = (process.env.SHIVVER_MODE || 'local') as DeploymentMode;
  const dataDir = process.env.SHIVVER_DATA_DIR || getDefaultDataDir();
  const storageDir = process.env.SHIVVER_STORAGE_DIR || 'storage';

  return {
    mode,
    dataDir,
    storageDir,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    googleDriveEnabled: false,
    syncIntervalMinutes: 30,
  };
}

function getDefaultDataDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '/tmp';
  if (process.platform === 'win32') {
    return process.env.APPDATA || path.join(home, 'AppData', 'Roaming', 'Shivver');
  }
  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'Shivver');
  }
  return path.join(home, '.shivver');
}

import path from 'path';

// Lazy getter for config path
let configCache: ShivverConfig | null = null;

export function loadConfig(): ShivverConfig {
  if (configCache) return configCache;
  const cfg = getConfig();
  configCache = cfg;
  return cfg;
}

export function saveConfig(cfg: Partial<ShivverConfig>): ShivverConfig {
  const current = loadConfig();
  const merged = { ...current, ...cfg };
  configCache = merged;
  // Persist to JSON in data dir (fire-and-forget)
  try {
    const configPath = path.join(merged.dataDir, 'config.json');
    const fs = require('fs');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2));
  } catch (err) {
    console.error('Failed to save config:', err);
  }
  return merged;
}

export function isLocalMode(): boolean {
  return loadConfig().mode === 'local';
}

// ── Storage ───────────────────────────────────────────────────────────────────
export async function saveFile(
  subdir: string,
  fileName: string,
  data: Buffer | string,
  mimeType: string = 'application/octet-stream'
): Promise<string> {
  const cfg = loadConfig();

  if (isLocalMode()) {
    const dir = path.join(cfg.dataDir, cfg.storageDir, subdir);
    const fs = require('fs');
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, fileName);
    const content = typeof data === 'string' ? data : data;
    fs.writeFileSync(filePath, content);
    return `/api/files/${subdir}/${fileName}`;
  } else {
    // Cloud: use Supabase client via dynamic import to avoid bundling
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(cfg.supabaseUrl!, cfg.supabaseKey!);
    const { error } = await supabase.storage
      .from('shivver-assets')
      .upload(`${subdir}/${fileName}`, data, { contentType: mimeType, upsert: true });

    if (error) throw error;
    const { data: urlData } = supabase.storage
      .from('shivver-assets')
      .getPublicUrl(`${subdir}/${fileName}`);
    return urlData.publicUrl;
  }
}

export function getSupabase() {
  const cfg = loadConfig();
  const { createClient } = require('@supabase/supabase-js');
  return createClient(cfg.supabaseUrl!, cfg.supabaseKey!);
}

// ── Google Drive ─────────────────────────────────────────────────────────────
export async function getGoogleAuthUrl(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;
  const scope = 'https://www.googleapis.com/auth/drive.file';

  return `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scope)}&` +
    `access_type=offline`;
}

export async function exchangeGoogleCode(code: string): Promise<{ refresh_token?: string; access_token: string }> {
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

  if (!resp.ok) throw new Error(`Token exchange failed: ${resp.statusText}`);
  return resp.json();
}

export async function syncToDrive(_config: ShivverConfig, _brainData: any): Promise<string> {
  // Placeholder — would use googleapis library
  return 'https://drive.google.com/drive/folders/backup';
}
