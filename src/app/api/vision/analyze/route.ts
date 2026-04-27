import { NextRequest, NextResponse } from 'next/server';
import { analyzeScreen } from '@/lib/vision';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, goal } = body;

    if (!image) {
      return NextResponse.json({ error: 'Image (base64) is required' }, { status: 400 });
    }

    const analysis = await analyzeScreen(image, goal || '');

    // Store analysis for debugging if needed
    // await db.insert(vision_analyses).values({...});

    return NextResponse.json({ success: true, analysis });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
