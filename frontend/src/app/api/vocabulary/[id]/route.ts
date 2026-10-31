import { NextRequest, NextResponse } from 'next/server';

function getBackendDeleteCandidates(id: string): string[] {
  const candidates: string[] = [];

  const addUrl = (base: string) => {
    if (!base) return;
    const clean = base.replace(/\/+$/, '');
    if (clean.endsWith('/vocabulary')) {
      candidates.push(`${clean}/${id}`);
      candidates.push(`${clean}/${id}/`);
    } else {
      candidates.push(`${clean}/vocabulary/${id}`);
      candidates.push(`${clean}/vocabulary/${id}/`);
    }
    try {
      const parsed = new URL(clean);
      candidates.push(`${parsed.origin}/api/v1/vocabulary/${id}`);
      candidates.push(`${parsed.origin}/api/v1/vocabulary/${id}/`);
      candidates.push(`${parsed.origin}/api/vocabulary/${id}`);
      candidates.push(`${parsed.origin}/api/vocabulary/${id}/`);
      candidates.push(`${parsed.origin}/vocabulary/${id}`);
      candidates.push(`${parsed.origin}/vocabulary/${id}/`);
    } catch {}
  };

  if (process.env.BACKEND_URL) addUrl(process.env.BACKEND_URL);
  if (process.env.NEXT_PUBLIC_API_URL) addUrl(process.env.NEXT_PUBLIC_API_URL);
  if (process.env.API_URL) addUrl(process.env.API_URL);
  if (process.env.FASTAPI_URL) addUrl(process.env.FASTAPI_URL);
  if (process.env.NEXT_PUBLIC_BACKEND_URL) addUrl(process.env.NEXT_PUBLIC_BACKEND_URL);
  if (process.env.RENDER_EXTERNAL_URL) addUrl(process.env.RENDER_EXTERNAL_URL);

  candidates.push(`http://127.0.0.1:8000/api/v1/vocabulary/${id}`);
  candidates.push(`http://127.0.0.1:8000/api/v1/vocabulary/${id}/`);
  candidates.push(`http://127.0.0.1:8000/api/vocabulary/${id}`);
  candidates.push(`http://127.0.0.1:8000/api/vocabulary/${id}/`);
  candidates.push(`http://127.0.0.1:8000/vocabulary/${id}`);
  candidates.push(`http://localhost:8000/api/v1/vocabulary/${id}`);
  candidates.push(`http://localhost:8000/api/vocabulary/${id}`);
  candidates.push(`http://localhost:8000/vocabulary/${id}`);

  return Array.from(new Set(candidates));
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get('authorization');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    };

    const backendUrls = getBackendDeleteCandidates(id);
    let isNetworkError = false;

    for (const url of backendUrls) {
      try {
        const response = await fetch(url, {
          method: 'DELETE',
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
      { detail: `Vocabulary item with ID ${id} not found.` },
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
