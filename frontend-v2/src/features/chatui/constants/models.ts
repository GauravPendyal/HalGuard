import type { ModelOption } from '../types';

export const AI_MODELS: ModelOption[] = [
  {
    id: 'normal',
    name: 'HalluciGuard',
    description: 'Generate, verify, judge, correct, re-verify, and preserve the result.',
    badge: 'FULL PIPELINE',
    tag: 'Recommended',
  },
  {
    id: 'stress_test',
    name: 'Stress test',
    description: 'Challenge the safety pipeline with a deliberately difficult draft.',
    badge: 'TEST',
    tag: 'Evaluation mode',
  },
];
