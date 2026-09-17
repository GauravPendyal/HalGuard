'use client';

import * as React from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { replayEvents } from '@/engine';

export function ReplayButton() {
  const [isReplaying, setIsReplaying] = React.useState(false);

  const handleReplay = async () => {
    setIsReplaying(true);
    await replayEvents();
    setIsReplaying(false);
  };

  return (
    <Button
      onClick={handleReplay}
      disabled={isReplaying}
      variant="glow"
      size="sm"
      className="gap-2 w-full justify-center"
    >
      <RotateCcw className={`w-3.5 h-3.5 ${isReplaying ? 'animate-spin' : ''}`} />
      <span>{isReplaying ? 'Replaying Events...' : 'Replay Verification Event History'}</span>
    </Button>
  );
}
