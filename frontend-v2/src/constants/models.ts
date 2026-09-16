import { ModelOption } from '@/components/chat/types';

export const AI_MODELS: ModelOption[] = [
  {
    id: 'gpt-4o',
    name: 'ChatGPT 4o',
    description: 'Our smartest and most versatile model for text, code & vision',
    badge: 'PLUS',
    isPro: true,
    tag: 'Great for complex tasks',
  },
  {
    id: 'gpt-4o-mini',
    name: 'ChatGPT 4o mini',
    description: 'Fast, lightweight model for everyday chat and quick coding',
    tag: 'Fastest response',
  },
  {
    id: 'o1-preview',
    name: 'o1-preview',
    description: 'Advanced reasoning model for hard STEM, math & logic problems',
    badge: 'REASONING',
    isPro: true,
    tag: 'Thinks before answering',
  },
  {
    id: 'o1-mini',
    name: 'o1-mini',
    description: 'Faster reasoning model tailored for coding, math, and science',
    badge: 'REASONING',
    isPro: true,
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5',
    description: 'Standard fast model for lightweight queries',
  },
];

export const MOCK_CONVERSATIONS = [
  {
    id: 'conv-1',
    title: 'React 19 & Next.js 15 Migration Guide',
    createdAt: Date.now() - 1000 * 60 * 30, // 30 mins ago
    updatedAt: Date.now() - 1000 * 60 * 30,
    modelId: 'gpt-4o',
    pinned: true,
    messages: [
      {
        id: 'm-1',
        role: 'user' as const,
        content: 'What are the main breaking changes in React 19 and how do Server Actions work?',
        timestamp: '14:20',
      },
      {
        id: 'm-2',
        role: 'assistant' as const,
        content: `### Key Highlights in React 19

React 19 introduces several major enhancements to streamline data fetching, form handling, and server execution.

#### 1. Actions & useActionState
Server Actions allow you to invoke async functions directly from form submissions or event handlers.

\`\`\`tsx
import { useActionState } from 'react';

async function updateName(previousState: string, formData: FormData) {
  const name = formData.get('name') as string;
  await saveNameToDatabase(name);
  return name;
}

export function UserForm() {
  const [state, formAction, isPending] = useActionState(updateName, '');

  return (
    <form action={formAction}>
      <input name="name" defaultValue={state} />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Update Name'}
      </button>
    </form>
  );
}
\`\`\`

#### 2. Direct Asset Loading & Preloading
- Automatic optimization for script, link, and style tags.
- Direct hydration support for async scripts.

#### 3. Deprecations
- Removed string refs (use callback refs or useRef).
- Removed propTypes in favor of TypeScript.`,
        timestamp: '14:21',
      },
    ],
  },
  {
    id: 'conv-2',
    title: 'Tailwind CSS v4 Responsive Layout',
    createdAt: Date.now() - 1000 * 60 * 60 * 5, // 5 hours ago
    updatedAt: Date.now() - 1000 * 60 * 60 * 5,
    modelId: 'gpt-4o-mini',
    pinned: false,
    messages: [
      {
        id: 'm-3',
        role: 'user' as const,
        content: 'How do container queries work in Tailwind v4?',
        timestamp: '09:15',
      },
      {
        id: 'm-4',
        role: 'assistant' as const,
        content: `In Tailwind CSS v4, container queries are built-in without requiring third-party plugins!

### Example Usage:

\`\`\`html
<div class="@container">
  <div class="grid grid-cols-1 @md:grid-cols-2 @xl:grid-cols-4 gap-4">
    <div class="p-4 bg-gray-100 rounded-lg">Card Item</div>
  </div>
</div>
\`\`\`

You mark a parent element with \`@container\` and target container size breakpoints with \`@md:\`, \`@lg:\`, or \`@xl:\` classes!`,
        timestamp: '09:16',
      },
    ],
  },
  {
    id: 'conv-3',
    title: 'Python Web Scraper with BeautifulSoup',
    createdAt: Date.now() - 1000 * 60 * 60 * 26, // Yesterday
    updatedAt: Date.now() - 1000 * 60 * 60 * 26,
    modelId: 'gpt-4o',
    pinned: false,
    messages: [],
  },
  {
    id: 'conv-4',
    title: 'Brainstorm SaaS product ideas',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3, // 3 days ago
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    modelId: 'gpt-4o',
    pinned: false,
    messages: [],
  },
];
