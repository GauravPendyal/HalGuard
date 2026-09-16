import { PromptSuggestion } from '../types';

export const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  {
    id: 'p-1',
    title: 'Verify a historical claim',
    subtitle: 'trace it to primary evidence',
    icon: 'Code',
    prompt: 'Who was the first person to walk on the Moon, and on what date? Verify every factual claim with evidence.',
  },
  {
    id: 'p-2',
    title: 'Check a scientific statement',
    subtitle: 'separate support from uncertainty',
    icon: 'BarChart2',
    prompt: 'Explain whether vitamin C prevents the common cold. Distinguish supported findings from uncertain or exaggerated claims.',
  },
  {
    id: 'p-3',
    title: 'Audit a technical answer',
    subtitle: 'inspect each checkable statement',
    icon: 'Mail',
    prompt: 'Explain how HTTPS protects a browser connection, then verify each security claim and show where important limitations remain.',
  },
  {
    id: 'p-4',
    title: 'Test a disputed claim',
    subtitle: 'keep conflicting evidence visible',
    icon: 'Lightbulb',
    prompt: 'Evaluate the claim that lightning never strikes the same place twice. Correct it only if the evidence requires a correction.',
  },
];
