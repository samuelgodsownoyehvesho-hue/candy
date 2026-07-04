import { useEffect, useState } from 'react';
import { LyricInputPanel } from '@/components/lyrics/LyricInputPanel';
import { LyricTimelineEditor } from '@/components/lyrics/LyricTimelineEditor';
import { LyricPreview } from '@/components/lyrics/LyricPreview';
import { computeEnergyEnvelope, detectSilenceGaps } from '@/lib/audioAnalysis';
import { generateLyricSync, parseRawLyrics } from '@/lib/lyrics';
import { useProjects } from '@/context/ProjectContext';
import type { LyricLine, LyricsDocument } from '@/types/lyrics';

interface LyricsPanelProps {
  projectId: string;
  savedLyrics: LyricsDocument | null;
  durationSeconds: number;
  currentTime: number;
  decodedBuffer: AudioBuffer | null;
  onSeek: (fraction: number) => void;
}

export function LyricsPanel({
  projectId,
  savedLyrics,
  durationSeconds,
  currentTime,
  decodedBuffer,
  onSeek,
}: LyricsPanelProps) {
  const { updateProjectLyrics } = useProjects();

  const [rawText, setRawText] = useState(savedLyrics?.rawText ?? '');
  const [lines, setLines] = useState<LyricLine[]>(savedLyrics?.lines ?? []);
  const [syncStatus, setSyncStatus] = useState<LyricsDocument['syncStatus']>(
    savedLyrics?.syncStatus ?? 'none',
  );
  const [syncedWithAI, setSyncedWithAI] = useState<boolean | null>(
    savedLyrics?.syncedWithAI ?? null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced persistence, same pattern as the visualizer panel.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      updateProjectLyrics(projectId, {
        rawText,
        lines,
        syncStatus,
        syncedWithAI: syncedWithAI ?? false,
        updatedAt: new Date().toISOString(),
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [rawText, lines, syncStatus, syncedWithAI, projectId, updateProjectLyrics]);

  async function handleGenerateSync() {
    const rawLines = parseRawLyrics(rawText);
    if (rawLines.length === 0 || durationSeconds <= 0) {
      setError('Add at least one line of lyrics before generating a sync.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      let silenceGaps: { start: number; end: number }[] = [];
      if (decodedBuffer) {
        const envelope = computeEnergyEnvelope(decodedBuffer.getChannelData(0), decodedBuffer.sampleRate);
        silenceGaps = detectSilenceGaps(envelope);
      }

      const result = await generateLyricSync(rawLines, durationSeconds, silenceGaps);
      setLines(result.lines);
      setSyncStatus('word-synced');
      setSyncedWithAI(result.usedAI);
    } catch {
      setError('Something went wrong generating the sync. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-5">
      <LyricInputPanel
        rawText={rawText}
        onRawTextChange={setRawText}
        onGenerateSync={handleGenerateSync}
        isGenerating={isGenerating}
        hasAudio={durationSeconds > 0}
        syncedWithAI={syncedWithAI}
        syncStatus={syncStatus}
        error={error}
      />

      {lines.length > 0 && (
        <>
          <div className="glass-raised rounded-xl">
            <LyricPreview lines={lines} currentTime={currentTime} />
          </div>

          <LyricTimelineEditor
            lines={lines}
            durationSeconds={durationSeconds}
            currentTime={currentTime}
            onSeek={onSeek}
            onChangeLines={(next) => {
              setLines(next);
              setSyncStatus('word-synced');
            }}
          />
        </>
      )}
    </div>
  );
}
