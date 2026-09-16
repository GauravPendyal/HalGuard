import { NextRequest, NextResponse } from 'next/server';

function backendBaseUrl(): string | null {
  const configured = (process.env.BACKEND_URL || '').trim().replace(/\/+$/, '');
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.toString().replace(/\/+$/, '');
    } catch {
      return null;
    }
  }
  if (process.env.NODE_ENV === 'development') return 'http://127.0.0.1:8000';
  // Current public backend. BACKEND_URL remains the deployment override.
  return 'https://halluciguard-api-okvo.onrender.com';
}

export async function proxyToBackend(request: NextRequest, pathname: string): Promise<NextResponse> {
  const baseUrl = backendBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ detail: 'Backend service is not configured. Set BACKEND_URL on the frontend deployment.' }, { status: 503 });
  }

  const target = new URL(pathname, `${baseUrl}/`);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));
  const headers = new Headers();
  for (const name of ['authorization', 'content-type', 'accept', 'x-request-id']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
      cache: 'no-store',
      redirect: 'manual',
    });
    const responseHeaders = new Headers();
    const contentType = response.headers.get('content-type');
    const requestId = response.headers.get('x-request-id');
    if (contentType) responseHeaders.set('content-type', contentType);
    if (requestId) responseHeaders.set('x-request-id', requestId);
    responseHeaders.set('cache-control', 'no-store');
    return new NextResponse(await response.arrayBuffer(), { status: response.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ detail: 'HalluciGuard backend is unavailable.' }, { status: 502 });
  }
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204, headers: { Allow: 'GET, POST, DELETE, OPTIONS' } });
}
