import { useCallback, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import type { LyricLine } from '@/types/lyrics';
import { buildWordsForLine } from '@/lib/lyrics';

interface LyricTimelineEditorProps {
  lines: LyricLine[];
  durationSeconds: number;
  currentTime: number;
  onSeek: (fraction: number) => void;
  onChangeLines: (lines: LyricLine[]) => void;
}

type DragKind = 'move' | 'start' | 'end';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(1);
  return `${m}:${s.padStart(4, '0')}`;
}

export function LyricTimelineEditor({
  lines,
  durationSeconds,
  currentTime,
  onSeek,
  onChangeLines,
}: LyricTimelineEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);

  const duration = Math.max(1, durationSeconds);
  const selectedLine = useMemo(
    () => lines.find((l) => l.id === selectedLineId) ?? null,
    [lines, selectedLineId],
  );

  function timeToPercent(t: number): number {
    return Math.min(100, Math.max(0, (t / duration) * 100));
  }

  function handleRulerClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(fraction);
  }

  const updateLineTiming = useCallback(
    (lineId: string, newStart: number, newEnd: number) => {
      const next = lines.map((l) => {
        if (l.id !== lineId) return l;
        const clampedStart = Math.max(0, Math.min(newStart, duration - 0.2));
        const clampedEnd = Math.max(clampedStart + 0.2, Math.min(newEnd, duration));
        return {
          ...l,
          startTime: clampedStart,
          endTime: clampedEnd,
          words: buildWordsForLine(l.text, clampedStart, clampedEnd),
        };
      });
      onChangeLines(next);
    },
    [lines, duration, onChangeLines],
  );

  const updateWordTiming = useCallback(
    (lineId: string, wordId: string, newStart: number, newEnd: number) => {
      const next = lines.map((l) => {
        if (l.id !== lineId) return l;
        const words = l.words.map((w) => {
          if (w.id !== wordId) return w;
          const clampedStart = Math.max(l.startTime, Math.min(newStart, l.endTime - 0.05));
          const clampedEnd = Math.max(clampedStart + 0.05, Math.min(newEnd, l.endTime));
          return { ...w, startTime: clampedStart, endTime: clampedEnd };
        });
        return { ...l, words };
      });
      onChangeLines(next);
    },
    [lines, onChangeLines],
  );

  function beginLineDrag(
    e: React.PointerEvent,
    kind: DragKind,
    lineId: string,
    originalStart: number,
    originalEnd: number,
  ) {
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pixelsPerSecond = rect.width / duration;
    const startX = e.clientX;

    function onMove(moveEvent: PointerEvent) {
      const deltaSeconds = (moveEvent.clientX - startX) / pixelsPerSecond;
      if (kind === 'move') {
        updateLineTiming(lineId, originalStart + deltaSeconds, originalEnd + deltaSeconds);
      } else if (kind === 'start') {
        updateLineTiming(lineId, originalStart + deltaSeconds, originalEnd);
      } else {
        updateLineTiming(lineId, originalStart, originalEnd + deltaSeconds);
      }
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function handleLineKeyDown(e: React.KeyboardEvent, line: LyricLine) {
    const nudge = e.shiftKey ? 1 : 0.1;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      updateLineTiming(line.id, line.startTime - nudge, line.endTime - nudge);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      updateLineTiming(line.id, line.startTime + nudge, line.endTime + nudge);
    }
  }

  function beginWordDrag(e: React.PointerEvent, lineId: string, wordId: string, wordStart: number, wordEnd: number, lineDuration: number, rect: DOMRect) {
    e.stopPropagation();
    const pixelsPerSecond = rect.width / lineDuration;
    const startX = e.clientX;

    function onMove(moveEvent: PointerEvent) {
      const deltaSeconds = (moveEvent.clientX - startX) / pixelsPerSecond;
      updateWordTiming(lineId, wordId, wordStart + deltaSeconds, wordEnd + deltaSeconds);
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        onClick={handleRulerClick}
        className="relative h-16 glass-raised rounded-xl overflow-hidden cursor-pointer select-none"
      >
        <div
          className="absolute top-0 bottom-0 w-px bg-amber z-20 pointer-events-none"
          style={{ left: `${timeToPercent(currentTime)}%` }}
        />
        {lines.map((line) => {
          const left = timeToPercent(line.startTime);
          const width = Math.max(0.6, timeToPercent(line.endTime) - left);
          const isSelected = selectedLineId === line.id;
          return (
            <div
              key={line.id}
              role="button"
              tabIndex={0}
              aria-label={`Lyric line: ${line.text}, ${formatTime(line.startTime)} to ${formatTime(line.endTime)}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedLineId(line.id);
              }}
              onKeyDown={(e) => handleLineKeyDown(e, line)}
              onPointerDown={(e) => beginLineDrag(e, 'move', line.id, line.startTime, line.endTime)}
              className={clsx(
                'absolute top-2 bottom-2 rounded-md flex items-center px-2 text-[11px] font-medium truncate cursor-grab active:cursor-grabbing transition-colors btn-focus-ring',
                isSelected
                  ? 'bg-teal/25 border border-teal text-ink'
                  : 'bg-amber/15 border border-amber/30 text-ink-muted hover:bg-amber/25',
              )}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={line.text}
            >
              <span
                onPointerDown={(e) => beginLineDrag(e, 'start', line.id, line.startTime, line.endTime)}
                className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize"
              />
              <span className="truncate pointer-events-none">{line.text}</span>
              <span
                onPointerDown={(e) => beginLineDrag(e, 'end', line.id, line.startTime, line.endTime)}
                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize"
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs readout text-ink-dim px-1">
        <span>0:00</span>
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {selectedLine && (
        <div className="glass-raised rounded-xl p-3">
          <p className="text-xs text-ink-muted mb-2">
            Word timing — <span className="text-ink font-medium">&ldquo;{selectedLine.text}&rdquo;</span>
          </p>
          <div className="relative h-12 bg-void-line/30 rounded-lg overflow-hidden">
            {selectedLine.words.map((word) => {
              const lineDuration = Math.max(0.01, selectedLine.endTime - selectedLine.startTime);
              const left = ((word.startTime - selectedLine.startTime) / lineDuration) * 100;
              const width = Math.max(1, ((word.endTime - word.startTime) / lineDuration) * 100);
              return (
                <div
                  key={word.id}
                  onPointerDown={(e) => {
                    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                    if (!rect) return;
                    beginWordDrag(e, selectedLine.id, word.id, word.startTime, word.endTime, lineDuration, rect);
                  }}
                  className="absolute top-1 bottom-1 rounded bg-teal/20 border border-teal/40 flex items-center justify-center text-[10px] text-ink px-1 truncate cursor-grab active:cursor-grabbing"
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={word.text}
                >
                  {word.text}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-ink-dim mt-2">
            Drag a word to shift it. Select a different line above to edit its words.
          </p>
        </div>
      )}
    </div>
  );
}
