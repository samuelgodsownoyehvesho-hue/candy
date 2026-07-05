import { useEffect, useState } from 'react';
import { LyricGeneratePanel } from '@/components/lyrics/LyricGeneratePanel';
import { LyricReviewList } from '@/components/lyrics/LyricReviewList';
import { LyricPreview } from '@/components/lyrics/LyricPreview';
import { requestTranscription } from '@/lib/groqClient';
import { useProjects } from '@/context/ProjectContext';
import type { LyricLine, LyricsDocument } from '@/types/lyrics';

interface LyricsPanelProps {
  projectId: string;
  savedLyrics: LyricsDocument | null;
  audioObjectUrl: string | null;
  audioFileName: string | null;
  durationSeconds: number;
  currentTime: number;
  onSeek: (fraction: number) => void;
}

export function LyricsPanel({
  projectId,
  savedLyrics,
  audioObjectUrl,
  audioFileName,
  durationSeconds,
  currentTime,
  onSeek,
}: LyricsPanelProps) {
  const { updateProjectLyrics } = useProjects();

  const [lines, setLines] = useState<LyricLine[]>(savedLyrics?.lines ?? []);
  const [syncStatus, setSyncStatus] = useState<LyricsDocument['syncStatus']>(
    savedLyrics?.syncStatus ?? 'none',
  );
  const [transcribedWithAI, setTranscribedWithAI] = useState(savedLyrics?.transcribedWithAI ?? false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      updateProjectLyrics(projectId, {
        lines,
        syncStatus,
        transcribedWithAI,
        updatedAt: new Date().toISOString(),
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [lines, syncStatus, transcribedWithAI, projectId, updateProjectLyrics]);

  async function handleGenerate() {
    if (!audioObjectUrl) {
      setError('Upload a track first.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const audioBlob = await fetch(audioObjectUrl).then((r) => r.blob());
      const result = await requestTranscription(
        audioBlob,
        audioFileName ?? 'audio.mp3',
        audioBlob.type || 'audio/mpeg',
      );

      if ('error' in result) {
        setError(result.error);
        return;
      }

      setLines(result.lines);
      setSyncStatus('transcribed');
      setTranscribedWithAI(true);
    } catch {
      setError('Something went wrong reading the audio file for transcription.');
    } finally {
      setIsGenerating(false);
    }
  }

  function handleSeekToLine(startTime: number) {
    if (durationSeconds > 0) onSeek(startTime / durationSeconds);
  }

  function handleChangeLines(next: LyricLine[]) {
    setLines(next);
    if (syncStatus === 'none' && next.length > 0) setSyncStatus('transcribed');
    if (next.some((l) => l.id.startsWith('manual-'))) setTranscribedWithAI(false);
  }

  return (
    <div className="space-y-5">
      <LyricGeneratePanel
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        hasAudio={!!audioObjectUrl}
        hasLines={lines.length > 0}
        transcribedWithAI={transcribedWithAI}
        error={error}
      />

      {lines.length > 0 && (
        <>
          <div className="glass-raised rounded-xl">
            <LyricPreview lines={lines} currentTime={currentTime} />
          </div>

          <LyricReviewList
            lines={lines}
            currentTime={currentTime}
            durationSeconds={durationSeconds}
            onSeekToLine={handleSeekToLine}
            onChangeLines={handleChangeLines}
          />
        </>
      )}

      {lines.length === 0 && !isGenerating && (
        <button
          onClick={() => handleChangeLines([{ id: `manual-${Date.now()}`, text: '', startTime: 0, endTime: 2, words: [] }])}
          className="w-full glass-raised rounded-xl py-3 text-sm text-ink-muted hover:text-ink transition-colors btn-focus-ring"
        >
          Or start with a blank line and add lyrics manually
        </button>
      )}
    </div>
  );
}
