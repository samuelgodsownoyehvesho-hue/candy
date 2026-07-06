import { Button } from '@/components/ui/Button';
import { IconSparkles, IconCheck } from '@/components/icons/Icons';

interface LyricGeneratePanelProps {
  onGenerate: () => void;
  isGenerating: boolean;
  hasAudio: boolean;
  hasLines: boolean;
  transcribedWithAI: boolean;
  error: string | null;
}

export function LyricGeneratePanel({
  onGenerate,
  isGenerating,
  hasAudio,
  hasLines,
  transcribedWithAI,
  error,
}: LyricGeneratePanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onGenerate} disabled={!hasAudio || isGenerating} iconLeft={<IconSparkles size={15} />}>
          {isGenerating ? 'Transcribing…' : hasLines ? 'Re-transcribe' : 'Transcribe lyrics with AI'}
        </Button>

        {!hasAudio && <span className="text-xs text-ink-dim">Upload a track above first.</span>}

        {hasLines && transcribedWithAI && (
          <span className="flex items-center gap-1.5 text-xs text-ink-muted">
            <IconCheck size={13} className="text-teal" />
            Transcribed with Groq Whisper
          </span>
        )}
      </div>

      {isGenerating && (
        <p className="text-xs text-ink-dim">
          Uploading and transcribing — this can take up to a minute for a full
          song. Please don't close this tab while it's running.
        </p>
      )}

      {error && <p className="text-xs text-clip-soft">{error}</p>}
    </div>
  );
}
