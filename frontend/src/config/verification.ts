import { VerificationMode, ModelOption } from '@/types';

export const MODEL_OPTIONS: ModelOption[] = [
  'HalluciGuard-v2-Deep',
  'GPT-4o-Guard',
  'Claude-3.5-Verify',
];

export const VERIFICATION_MODES: { id: VerificationMode; label: string; desc: string; color: string }[] = [
  { id: 'strict', label: 'Strict Verification', desc: '100% consensus, 30+ web API sources', color: 'text-emerald-400' },
  { id: 'standard', label: 'Standard Guard', desc: 'Balanced accuracy & sub-second latency', color: 'text-blue-400' },
  { id: 'fast', label: 'Fast Pass', desc: 'Heuristic & vector memory verification', color: 'text-amber-400' },
];

export const APP_ROUTES = {
  home: '/',
  chat: '/chat',
};

export const ENV_CONFIG = {
  isMock: true,
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws',
};
