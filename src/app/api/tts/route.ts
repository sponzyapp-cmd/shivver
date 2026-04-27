import { NextRequest, NextResponse } from 'next/server';
import { saveFile } from '@/lib/storage';

export async function POST(req: NextRequest) {
  const { text, voiceId } = await req.json();

  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 });
  }

  try {
    const voiceIdEnv = voiceId || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceIdEnv}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.5, similarity_boost: 0.8 },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`TTS failed: ${response.statusText}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const fileName = `tts/${Date.now()}.mp3`;

    const audioUrl = await saveFile('tts', `${Date.now()}.mp3`, audioBuffer, 'audio/mpeg');

    const duration = text.split(/\s+/).length * 0.15;

    return NextResponse.json({ audioUrl, duration });
  } catch (err: any) {
    console.error('TTS error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
