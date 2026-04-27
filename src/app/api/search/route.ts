import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { query, numResults = 10 } = await req.json();

  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  try {
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.EXA_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        numResults,
        type: 'neural',
        contents: { text: true, highlights: true },
      }),
    });

    if (!response.ok) {
      throw new Error(`Exa error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json({
      results: (data.results || []).map((r: any) => ({
        title: r.title,
        url: r.url,
        text: r.text?.slice(0, 5000),
        highlights: r.highlights,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
