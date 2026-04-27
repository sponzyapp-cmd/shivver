import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getConfig } from '@/lib/platform';

// GET /api/files/[...path] — serve local files in local mode
export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathSegments } = await params;
  const subdir = pathSegments[0]; // e.g., 'tts'
  const fileName = pathSegments.slice(1).join('/');

  if (!subdir || !fileName) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const cfg = getConfig();

  // For local mode, read from disk
  if (process.env.NODE_ENV !== 'production' || cfg.mode === 'local') {
    const filePath = path.join(cfg.dataDir, cfg.storageDir, subdir, fileName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const content = fs.readFileSync(filePath);
    const mime = getMimeType(fileName);

    return new NextResponse(content, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  // Cloud mode: redirect to Supabase public URL
  const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const bucket = 'shivver-assets';
  const publicUrl = `${supabaseBase}/storage/v1/object/public/${bucket}/${subdir}/${fileName}`;
  return NextResponse.redirect(publicUrl);
}

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    json: 'application/json',
    txt: 'text/plain',
  };
  return types[ext || ''] || 'application/octet-stream';
}
