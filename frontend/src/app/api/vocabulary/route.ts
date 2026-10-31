import { NextRequest, NextResponse } from 'next/server';

function getBackendCandidates(): string[] {
  const candidates: string[] = [];

  const addUrl = (base: string) => {
    if (!base) return;
    const clean = base.replace(/\/+$/, '');
    if (clean.endsWith('/vocabulary')) {
      candidates.push(clean);
      candidates.push(`${clean}/`);
    } else {
      candidates.push(`${clean}/vocabulary`);
      candidates.push(`${clean}/vocabulary/`);
    }
    // Also try without /api or /v1 prefix variations if applicable
    try {
      const parsed = new URL(clean);
      candidates.push(`${parsed.origin}/api/v1/vocabulary`);
      candidates.push(`${parsed.origin}/api/v1/vocabulary/`);
      candidates.push(`${parsed.origin}/api/vocabulary`);
      candidates.push(`${parsed.origin}/api/vocabulary/`);
      candidates.push(`${parsed.origin}/vocabulary`);
      candidates.push(`${parsed.origin}/vocabulary/`);
    } catch {}
  };

  if (process.env.BACKEND_URL) addUrl(process.env.BACKEND_URL);
  if (process.env.NEXT_PUBLIC_API_URL) addUrl(process.env.NEXT_PUBLIC_API_URL);
  if (process.env.API_URL) addUrl(process.env.API_URL);
  if (process.env.FASTAPI_URL) addUrl(process.env.FASTAPI_URL);
  if (process.env.NEXT_PUBLIC_BACKEND_URL) addUrl(process.env.NEXT_PUBLIC_BACKEND_URL);
  if (process.env.RENDER_EXTERNAL_URL) addUrl(process.env.RENDER_EXTERNAL_URL);

  // Common local development fallbacks (IPv4 first to avoid Node undici IPv6 ::1 ECONNREFUSED)
  candidates.push('http://127.0.0.1:8000/api/v1/vocabulary');
  candidates.push('http://127.0.0.1:8000/api/v1/vocabulary/');
  candidates.push('http://127.0.0.1:8000/api/vocabulary');
  candidates.push('http://127.0.0.1:8000/api/vocabulary/');
  candidates.push('http://127.0.0.1:8000/vocabulary');
  candidates.push('http://localhost:8000/api/v1/vocabulary');
  candidates.push('http://localhost:8000/api/vocabulary');
  candidates.push('http://localhost:8000/vocabulary');

  return Array.from(new Set(candidates));
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    };

    const backendUrls = getBackendCandidates();
    let isNetworkError = false;

    for (const url of backendUrls) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json(data);
        }

        // If backend returned a 401 or 403, it responded correctly but auth failed
        if (response.status === 401 || response.status === 403) {
          const errText = await response.text();
          return new NextResponse(errText, {
            status: response.status,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // For other 4xx/5xx responses from the backend, forward them
        if (response.status !== 404) {
          const errText = await response.text();
          return new NextResponse(errText, {
            status: response.status,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch {
        isNetworkError = true;
        continue;
      }
    }

    if (isNetworkError) {
      return NextResponse.json(
        { detail: 'Backend vocabulary service is currently unreachable. Please verify that the FastAPI backend server is running on http://127.0.0.1:8000.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { detail: 'Vocabulary service endpoint not found.' },
      { status: 404 }
    );
  } catch (error: any) {
    const msg = error?.message || 'Internal proxy error';
    if (typeof msg === 'string' && msg.toLowerCase().includes('fetch failed')) {
      return NextResponse.json(
        { detail: 'Backend vocabulary service is currently unreachable. Please verify that the FastAPI backend server is running on http://127.0.0.1:8000.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const body = await req.json();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    };

    const backendUrls = getBackendCandidates();
    let isNetworkError = false;

    for (const url of backendUrls) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json(data, { status: 201 });
        }

        if (response.status === 401 || response.status === 403) {
          const errText = await response.text();
          return new NextResponse(errText, {
            status: response.status,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (response.status !== 404) {
          const errText = await response.text();
          return new NextResponse(errText, {
            status: response.status,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch {
        isNetworkError = true;
        continue;
      }
    }

    if (isNetworkError) {
      return NextResponse.json(
        { detail: 'Backend vocabulary service is currently unreachable. Please verify that the FastAPI backend server is running on http://127.0.0.1:8000.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { detail: 'Vocabulary service endpoint not found.' },
      { status: 404 }
    );
  } catch (error: any) {
    const msg = error?.message || 'Internal proxy error';
    if (typeof msg === 'string' && msg.toLowerCase().includes('fetch failed')) {
      return NextResponse.json(
        { detail: 'Backend vocabulary service is currently unreachable. Please verify that the FastAPI backend server is running on http://127.0.0.1:8000.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
