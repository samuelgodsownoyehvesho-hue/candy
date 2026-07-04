import { useMemo } from 'react';
import clsx from 'clsx';
import type { LyricLine } from '@/types/lyrics';

interface LyricPreviewProps {
  lines: LyricLine[];
  currentTime: number;
}

export function LyricPreview({ lines, currentTime }: LyricPreviewProps) {
  const activeLine = useMemo(
    () => lines.find((l) => currentTime >= l.startTime && currentTime < l.endTime) ?? null,
    [lines, currentTime],
  );

  if (lines.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-ink-dim text-sm">
        Generate a sync to preview your lyrics here.
      </div>
    );
  }

  if (!activeLine) {
    return (
      <div className="flex items-center justify-center h-24 text-ink-dim text-sm">
        (instrumental)
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-24 px-4 text-center">
      <p className="font-display text-xl md:text-2xl font-semibold leading-snug">
        {activeLine.words.map((word) => {
          const isActive = currentTime >= word.startTime && currentTime < word.endTime;
          const isPast = currentTime >= word.endTime;
          return (
            <span
              key={word.id}
              className={clsx(
                'transition-colors duration-150 mr-2 inline-block',
                isActive && 'text-teal',
                isPast && !isActive && 'text-ink-muted',
                !isActive && !isPast && 'text-ink-dim',
              )}
            >
              {word.text}
            </span>
          );
        })}
      </p>
    </div>
  );
}
