import { NextRequest } from 'next/server';
import { noContent, proxyToBackend } from '@/lib/server/backendProxy';
export const dynamic = 'force-dynamic';
export const GET = (request: NextRequest) => proxyToBackend(request, '/health');
export const OPTIONS = () => noContent();
