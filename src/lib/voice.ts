import { supabase } from './supabase';

export async function textToSpeech(
  text: string,
  voiceId?: string,
): Promise<{ audioUrl: string; duration: number }> {
  const voice = voiceId || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

  // Use ElevenLabs REST API directly
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`TTS failed: ${response.statusText}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());

  // Upload to Supabase Storage
  const fileName = `tts/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.mp3`;

  const { error } = await supabase.storage
    .from('shivver-assets')
    .upload(fileName, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload TTS audio: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('shivver-assets')
    .getPublicUrl(fileName);

  const wordCount = text.split(/\s+/).length;
  const duration = wordCount * 0.15;

  return { audioUrl: urlData.publicUrl, duration };
}

export async function speechToText(audioBlob: Blob): Promise<{ text: string }> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.mp3');
  formData.append('model_id', 'whisper-1');

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
    },
    body: formData,
  });

  if (!response.ok) {
    // Fallback to OpenAI Whisper
    return await transcribeWithOpenAI(audioBlob);
  }

  const data = await response.json();
  return { text: data.text };
}

async function transcribeWithOpenAI(audioBlob: Blob): Promise<{ text: string }> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.mp3');
  formData.append('model', 'whisper-1');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('STT failed on all providers');
  }

  const data = await response.json();
  return { text: data.text };
}
