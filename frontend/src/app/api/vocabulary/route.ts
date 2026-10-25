import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URLS = [
  'http://localhost:8000/api/vocabulary',
  'http://localhost:8000/api/v1/vocabulary',
  'http://localhost:8000/vocabulary',
];

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    };

    let lastError = 'Failed to reach vocabulary service';
    for (const url of BACKEND_URLS) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json(data);
        }

        const errText = await response.text();
        return new NextResponse(errText, {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        lastError = err.message || lastError;
        continue;
      }
    }

    return NextResponse.json({ detail: lastError }, { status: 502 });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message || 'Internal error' }, { status: 500 });
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

    let lastError = 'Failed to reach vocabulary service';
    for (const url of BACKEND_URLS) {
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

        const errText = await response.text();
        return new NextResponse(errText, {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        lastError = err.message || lastError;
        continue;
      }
    }

    return NextResponse.json({ detail: lastError }, { status: 502 });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message || 'Internal error' }, { status: 500 });
  }
}
