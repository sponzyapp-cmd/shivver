import { getConfig, isLocalMode } from './platform';
import fs from 'fs';
import path from 'path';

export async function saveFile(subdir: string, fileName: string, data: Buffer | string, mimeType: string = 'application/octet-stream'): Promise<string> {
  const cfg = getConfig();

  if (isLocalMode()) {
    // Save to local filesystem
    const dir = path.join(cfg.dataDir, cfg.storageDir, subdir);
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, fileName);
    const content = typeof data === 'string' ? data : data;
    fs.writeFileSync(filePath, content);
    // Return relative URL (served via /api/files/)
    return `/api/files/${subdir}/${fileName}`;
  } else {
    // Cloud: use Supabase storage
    const supabase = (await import('@/lib/supabase')).supabase;
    const { data, error } = await supabase.storage
      .from('shivver-assets')
      .upload(`${subdir}/${fileName}`, data, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('shivver-assets')
      .getPublicUrl(`${subdir}/${fileName}`);

    return urlData.publicUrl;
  }
}

export async function readFile(subdir: string, fileName: string): Promise<Buffer | null> {
  const cfg = getConfig();

  if (isLocalMode()) {
    const filePath = path.join(cfg.dataDir, cfg.storageDir, subdir, fileName);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
    return null;
  } else {
    const supabase = (await import('@/lib/supabase')).supabase;
    const { data, error } = await supabase.storage
      .from('shivver-assets')
      .download(`${subdir}/${fileName}`);

    if (error) return null;
    return Buffer.from(await data.arrayBuffer());
  }
}

export async function deleteFile(subdir: string, fileName: string): Promise<void> {
  const cfg = getConfig();

  if (isLocalMode()) {
    const filePath = path.join(cfg.dataDir, cfg.storageDir, subdir, fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } else {
    const supabase = (await import('@/lib/supabase')).supabase;
    await supabase.storage.from('shivver-assets').remove([`${subdir}/${fileName}`]);
  }
}

export async function listFiles(subdir: string): Promise<string[]> {
  const cfg = getConfig();

  if (isLocalMode()) {
    const dir = path.join(cfg.dataDir, cfg.storageDir, subdir);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir);
  } else {
    const supabase = (await import('@/lib/supabase')).supabase;
    const { data, error } = await supabase.storage
      .from('shivver-assets')
      .list(subdir);

    if (error) return [];
    return data.map(f => f.name);
  }
}
