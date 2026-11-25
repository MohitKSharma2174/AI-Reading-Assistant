import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const selected_text = body.selected_text;

    if (!selected_text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Forward to FastAPI backend
    const endpoints: string[] = [];
    const addEndpoint = (base?: string) => {
      if (!base) return;
      const clean = base.replace(/\/+$/, '');
      if (clean.endsWith('/explain-text')) {
        endpoints.push(clean);
      } else {
        endpoints.push(`${clean}/explain-text`);
      }
      try {
        const parsed = new URL(clean);
        endpoints.push(`${parsed.origin}/api/v1/explain-text`);
        endpoints.push(`${parsed.origin}/api/explain-text`);
        endpoints.push(`${parsed.origin}/explain-text`);
      } catch {}
    };

    addEndpoint(process.env.BACKEND_URL);
    addEndpoint(process.env.NEXT_PUBLIC_API_URL);
    addEndpoint(process.env.API_URL);
    addEndpoint(process.env.FASTAPI_URL);
    addEndpoint(process.env.NEXT_PUBLIC_BACKEND_URL);
    endpoints.push('http://127.0.0.1:8000/api/v1/explain-text');
    endpoints.push('http://127.0.0.1:8000/api/explain-text');
    endpoints.push('http://localhost:8000/api/v1/explain-text');

    const backendEndpoints = Array.from(new Set(endpoints));

    const authHeader = req.headers.get('authorization');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    };

    for (const endpoint of backendEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({ selected_text }),
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json(data);
        }

        if (response.status === 401 || response.status === 403) {
          const errText = await response.text();
          return new NextResponse(errText, {
            status: response.status,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch {
        continue;
      }
    }

    return NextResponse.json(
      { detail: 'Backend AI explanation service could not be reached.' },
      { status: 502 }
    );
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : 'Internal proxy error';
    return NextResponse.json(
      { detail },
      { status: 500 }
    );
  }
}
