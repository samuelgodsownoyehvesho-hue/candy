import { useState } from 'react';
import { buildWordsForLine } from '@/lib/lyrics';
import type { LyricLine } from '@/types/lyrics';
import { IconTrash, IconPlus, IconMinus } from '@/components/icons/Icons';

interface LyricReviewListProps {
  lines: LyricLine[];
  currentTime: number;
  durationSeconds: number;
  onSeekToLine: (startTime: number) => void;
  onChangeLines: (lines: LyricLine[]) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const NUDGE_STEP = 0.1;

export function LyricReviewList({
  lines,
  currentTime,
  durationSeconds,
  onSeekToLine,
  onChangeLines,
}: LyricReviewListProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function commitText(line: LyricLine, text: string) {
    if (text === line.text) return;
    const next = lines.map((l) =>
      l.id === line.id
        ? { ...l, text, words: buildWordsForLine(text, l.startTime, l.endTime) }
        : l,
    );
    onChangeLines(next);
  }

  function nudge(line: LyricLine, field: 'startTime' | 'endTime', delta: number) {
    const next = lines.map((l) => {
      if (l.id !== line.id) return l;
      let start = l.startTime;
      let end = l.endTime;
      if (field === 'startTime') {
        start = Math.max(0, Math.min(l.startTime + delta, l.endTime - 0.2));
      } else {
        end = Math.min(durationSeconds, Math.max(l.endTime + delta, l.startTime + 0.2));
      }
      return { ...l, startTime: start, endTime: end, words: buildWordsForLine(l.text, start, end) };
    });
    onChangeLines(next);
  }

  function deleteLine(lineId: string) {
    onChangeLines(lines.filter((l) => l.id !== lineId));
  }

  function addLine() {
    const lastEnd = lines.length > 0 ? lines[lines.length - 1].endTime : currentTime;
    const start = Math.min(lastEnd, Math.max(0, durationSeconds - 2));
    const end = Math.min(durationSeconds, start + 2);
    const newLine: LyricLine = {
      id: `manual-${Date.now()}`,
      text: '',
      startTime: start,
      endTime: end,
      words: [],
    };
    onChangeLines([...lines, newLine]);
  }

  return (
    <div className="space-y-3">
      <div className="max-h-[420px] overflow-y-auto space-y-2.5 pr-1">
        {lines.map((line) => {
          const isActive = currentTime >= line.startTime && currentTime < line.endTime;
          return (
            <div
              key={line.id}
              className={`glass-raised rounded-xl p-3 transition-colors ${
                isActive ? 'ring-1 ring-teal' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => onSeekToLine(line.startTime)}
                  className="readout text-teal text-xs btn-focus-ring rounded px-1.5 py-0.5 hover:bg-teal/10"
                  title="Jump to this time"
                >
                  {formatTime(line.startTime)} – {formatTime(line.endTime)}
                </button>

                <div className="flex items-center gap-1">
                  <NudgeButton icon={<IconMinus size={11} />} label="Earlier start" onClick={() => nudge(line, 'startTime', -NUDGE_STEP)} />
                  <NudgeButton icon={<IconPlus size={11} />} label="Later start" onClick={() => nudge(line, 'startTime', NUDGE_STEP)} />
                  <span className="w-px h-4 bg-void-line mx-0.5" />
                  <NudgeButton icon={<IconMinus size={11} />} label="Earlier end" onClick={() => nudge(line, 'endTime', -NUDGE_STEP)} />
                  <NudgeButton icon={<IconPlus size={11} />} label="Later end" onClick={() => nudge(line, 'endTime', NUDGE_STEP)} />
                  <button
                    onClick={() => deleteLine(line.id)}
                    aria-label="Delete line"
                    className="btn-focus-ring p-1 rounded-md text-ink-dim hover:text-clip-soft hover:bg-clip/10 ml-1"
                  >
                    <IconTrash size={12} />
                  </button>
                </div>
              </div>

              <textarea
                value={drafts[line.id] ?? line.text}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [line.id]: e.target.value }))}
                onBlur={(e) => commitText(line, e.target.value)}
                rows={1}
                placeholder="Type this line's lyrics…"
                className="w-full bg-transparent text-sm text-ink placeholder:text-ink-dim outline-none resize-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal rounded-md px-1 py-0.5"
              />
            </div>
          );
        })}
      </div>

      <button
        onClick={addLine}
        className="w-full flex items-center justify-center gap-1.5 glass-raised rounded-xl py-2.5 text-sm text-ink-muted hover:text-ink transition-colors btn-focus-ring"
      >
        <IconPlus size={14} /> Add line
      </button>
    </div>
  );
}

function NudgeButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="btn-focus-ring h-6 w-6 flex items-center justify-center rounded-md text-ink-dim hover:text-ink hover:bg-white/5 transition-colors"
    >
      {icon}
    </button>
  );
}
