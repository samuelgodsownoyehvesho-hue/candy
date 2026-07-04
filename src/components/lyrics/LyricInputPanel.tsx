import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { IconSparkles, IconCheck } from '@/components/icons/Icons';

interface LyricInputPanelProps {
  rawText: string;
  onRawTextChange: (text: string) => void;
  onGenerateSync: () => void;
  isGenerating: boolean;
  hasAudio: boolean;
  syncedWithAI: boolean | null;
  syncStatus: 'none' | 'line-synced' | 'word-synced';
  error: string | null;
}

export function LyricInputPanel({
  rawText,
  onRawTextChange,
  onGenerateSync,
  isGenerating,
  hasAudio,
  syncedWithAI,
  syncStatus,
  error,
}: LyricInputPanelProps) {
  const [localText, setLocalText] = useState(rawText);

  function handleBlur() {
    if (localText !== rawText) onRawTextChange(localText);
  }

  return (
    <div className="space-y-3">
      <textarea
        value={localText}
        onChange={(e) => setLocalText(e.target.value)}
        onBlur={handleBlur}
        placeholder={'Paste your lyrics here, one line per line...\n\nVerse 1\nWalking through the midnight air\nNothing left to say or share'}
        rows={8}
        className="w-full glass-raised rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-dim outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal resize-y font-mono leading-relaxed"
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={onGenerateSync}
          disabled={!hasAudio || isGenerating || localText.trim().length === 0}
          iconLeft={<IconSparkles size={15} />}
        >
          {isGenerating ? 'Syncing…' : syncStatus === 'none' ? 'Generate sync' : 'Re-sync lyrics'}
        </Button>

        {!hasAudio && <span className="text-xs text-ink-dim">Upload a track above first.</span>}

        {syncStatus !== 'none' && syncedWithAI !== null && (
          <span className="flex items-center gap-1.5 text-xs text-ink-muted">
            <IconCheck size={13} className="text-teal" />
            {syncedWithAI
              ? 'Synced with Grok'
              : 'Synced with the local timing algorithm (Grok unavailable)'}
          </span>
        )}
      </div>

      {error && <p className="text-xs text-clip-soft">{error}</p>}
    </div>
  );
}
