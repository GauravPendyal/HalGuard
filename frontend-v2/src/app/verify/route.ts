import { NextRequest } from 'next/server';
import { noContent, proxyToBackend } from '@/lib/server/backendProxy';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export const POST = (request: NextRequest) => proxyToBackend(request, '/verify');
export const OPTIONS = () => noContent();
