import { NextRequest } from 'next/server';
import { noContent, proxyToBackend } from '@/lib/server/backendProxy';
export const dynamic = 'force-dynamic';
export const POST = (request: NextRequest) => proxyToBackend(request, '/auth/login');
export const OPTIONS = () => noContent();
