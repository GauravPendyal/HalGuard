'use client';

import { useEffect } from 'react';

export function useKeyboardShortcut(
  keyCombo: { key: string; metaKey?: boolean; ctrlKey?: boolean },
  callback: () => void
) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const matchKey = event.key.toLowerCase() === keyCombo.key.toLowerCase();
      const matchMeta = keyCombo.metaKey ? event.metaKey || event.ctrlKey : true;
      const matchCtrl = keyCombo.ctrlKey ? event.ctrlKey : true;

      if (matchKey && matchMeta && matchCtrl) {
        event.preventDefault();
        callback();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyCombo, callback]);
}
