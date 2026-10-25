import { NextRequest, NextResponse } from 'next/server';

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

    const backendUrls = [
      `http://localhost:8000/api/vocabulary/${id}`,
      `http://localhost:8000/api/v1/vocabulary/${id}`,
      `http://localhost:8000/vocabulary/${id}`,
    ];

    let lastError = 'Failed to reach vocabulary service';
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
