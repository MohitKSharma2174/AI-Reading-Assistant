import { NextRequest, NextResponse } from 'next/server';

function buildCandidateUrls(q: string): string[] {
  const queryParam = `q=${encodeURIComponent(q)}`;
  const endpoints: string[] = [];

  const addBase = (base?: string) => {
    if (!base) return;
    const clean = base.replace(/\/+$/, '');
    endpoints.push(`${clean}/search?${queryParam}`);
    endpoints.push(`${clean}/api/search?${queryParam}`);
    endpoints.push(`${clean}/api/v1/search?${queryParam}`);
    endpoints.push(`${clean}/articles/search?${queryParam}`);

    try {
      const parsed = new URL(clean);
      endpoints.push(`${parsed.origin}/api/search?${queryParam}`);
      endpoints.push(`${parsed.origin}/api/v1/search?${queryParam}`);
      endpoints.push(`${parsed.origin}/api/v1/articles/search?${queryParam}`);
      endpoints.push(`${parsed.origin}/search?${queryParam}`);
    } catch {}
  };

  addBase(process.env.BACKEND_URL);
  addBase(process.env.NEXT_PUBLIC_API_URL);
  addBase(process.env.API_URL);
  addBase(process.env.FASTAPI_URL);
  addBase(process.env.NEXT_PUBLIC_BACKEND_URL);

  // Local fallbacks
  endpoints.push(`http://127.0.0.1:8000/api/search?${queryParam}`);
  endpoints.push(`http://localhost:8000/api/search?${queryParam}`);
  endpoints.push(`http://127.0.0.1:8000/api/v1/search?${queryParam}`);
  endpoints.push(`http://localhost:8000/api/v1/search?${queryParam}`);
  endpoints.push(`http://127.0.0.1:8000/api/v1/articles/search?${queryParam}`);

  return Array.from(new Set(endpoints));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const authHeader = req.headers.get('authorization');

    if (!q.trim()) {
      return NextResponse.json([]);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    };

    const candidateUrls = buildCandidateUrls(q);

    for (const url of candidateUrls) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers,
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

    return NextResponse.json([], { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ detail: error?.message || 'Search proxy error' }, { status: 500 });
  }
}


