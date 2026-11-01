import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const authHeader = req.headers.get('authorization');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    };

    const candidateUrls = [
      `http://127.0.0.1:8000/api/search?q=${encodeURIComponent(q)}`,
      `http://localhost:8000/api/search?q=${encodeURIComponent(q)}`,
      `http://127.0.0.1:8000/api/v1/search?q=${encodeURIComponent(q)}`,
      `http://localhost:8000/api/v1/search?q=${encodeURIComponent(q)}`,
    ];

    if (process.env.BACKEND_URL) {
      candidateUrls.unshift(`${process.env.BACKEND_URL.replace(/\/+$/, '')}/api/search?q=${encodeURIComponent(q)}`);
    }

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

