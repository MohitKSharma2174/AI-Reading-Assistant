import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const selected_text = body.selected_text;

    if (!selected_text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Forward to FastAPI backend
    const backendEndpoints = [
      'http://localhost:8000/api/v1/explain-text',
      'http://localhost:8000/api/explain-text',
      'http://localhost:8000/explain-text',
    ];

    for (const endpoint of backendEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(req.headers.get('authorization')
              ? { Authorization: req.headers.get('authorization')! }
              : {}),
          },
          body: JSON.stringify({ selected_text }),
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json(data);
        }
      } catch {
        continue;
      }
    }

    return NextResponse.json(
      { detail: 'Backend AI explanation service could not be reached.' },
      { status: 502 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { detail: error.message || 'Internal proxy error' },
      { status: 500 }
    );
  }
}
