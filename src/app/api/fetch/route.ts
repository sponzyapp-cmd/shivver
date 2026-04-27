import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { url, maxChars = 50000 } = await req.json();

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const jinaUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`;
    const response = await fetch(jinaUrl, {
      headers: { 'Accept': 'text/plain' },
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.statusText}`);
    }

    const text = await response.text();
    return NextResponse.json({
      url,
      content: text.slice(0, maxChars),
      truncated: text.length > maxChars,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
