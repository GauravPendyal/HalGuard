import { PromptSuggestion } from '@/components/chat/types';

export const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  {
    id: 'p-1',
    title: 'Create a Python script',
    subtitle: 'for web scraping and data export',
    icon: 'Code',
    prompt: 'Write a clean Python script using BeautifulSoup and pandas to scrape table data from a website and save it to a CSV file.',
  },
  {
    id: 'p-2',
    title: 'Analyze dataset',
    subtitle: 'and provide statistical summary',
    icon: 'BarChart2',
    prompt: 'How can I calculate mean, standard deviation, and identify outliers in a pandas DataFrame with missing values?',
  },
  {
    id: 'p-3',
    title: 'Draft a professional email',
    subtitle: 'to pitch a new software product',
    icon: 'Mail',
    prompt: 'Write a cold email template pitching a enterprise AI UI component library to VP of Engineering.',
  },
  {
    id: 'p-4',
    title: 'Brainstorm strategy',
    subtitle: 'for growing developer newsletter',
    icon: 'Lightbulb',
    prompt: 'Give me 5 actionable growth tactics to reach 10k subscribers for a weekly frontend engineering newsletter.',
  },
];
