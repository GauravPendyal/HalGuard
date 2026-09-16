import { NextRequest } from 'next/server';
import { noContent, proxyToBackend } from '@/lib/server/backendProxy';
export const dynamic = 'force-dynamic';
export const GET = (request: NextRequest) => proxyToBackend(request, '/api/history');
export const POST = (request: NextRequest) => proxyToBackend(request, '/api/history');
export const DELETE = (request: NextRequest) => proxyToBackend(request, '/api/history');
export const OPTIONS = () => noContent();
