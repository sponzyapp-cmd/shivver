import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const audioFile = formData.get('file') as File;

  if (!audioFile) {
    return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
  }

  try {
    // Try ElevenLabs first
    const elevenForm = new FormData();
    elevenForm.append('file', audioFile, 'audio.mp3');
    elevenForm.append('model_id', 'whisper-1');

    const elevenResp = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY! },
      body: elevenForm,
    });

    if (elevenResp.ok) {
      const data = await elevenResp.json();
      return NextResponse.json({ text: data.text });
    }

    // Fallback to OpenAI Whisper
    const openaiForm = new FormData();
    openaiForm.append('file', audioFile, 'audio.mp3');
    openaiForm.append('model', 'whisper-1');

    const openaiResp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: openaiForm,
    });

    if (!openaiResp.ok) {
      throw new Error('STT failed');
    }

    const data = await openaiResp.json();
    return NextResponse.json({ text: data.text });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
