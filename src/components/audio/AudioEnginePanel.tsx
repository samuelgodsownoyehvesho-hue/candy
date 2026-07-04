import { useState } from 'react';
import clsx from 'clsx';
import type { UseAudioEngineResult } from '@/hooks/useAudioEngine';
import { WaveformView } from '@/components/audio/WaveformView';
import { PlaybackControls } from '@/components/audio/PlaybackControls';
import { FrequencyAnalyzer } from '@/components/audio/FrequencyAnalyzer';
import { SpectrogramView } from '@/components/audio/SpectrogramView';
import { IconActivity, IconSpectrum } from '@/components/icons/Icons';

interface AudioEnginePanelProps {
  engine: UseAudioEngineResult;
}

type AnalysisTab = 'frequency' | 'spectrogram';

export function AudioEnginePanel({ engine }: AudioEnginePanelProps) {
  const [tab, setTab] = useState<AnalysisTab>('frequency');

  return (
    <div className="space-y-4">
      <div className="glass-raised rounded-xl p-4">
        <WaveformView containerRef={engine.containerRef} isReady={engine.isReady} />
      </div>

      <PlaybackControls
        isPlaying={engine.isPlaying}
        currentTime={engine.currentTime}
        duration={engine.duration}
        volume={engine.volume}
        disabled={!engine.isReady}
        onTogglePlay={engine.togglePlay}
        onSeekBy={engine.seekBy}
        onVolumeChange={engine.setVolume}
      />

      {engine.error && <p className="text-xs text-clip-soft">{engine.error}</p>}

      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <TabButton
            active={tab === 'frequency'}
            onClick={() => setTab('frequency')}
            icon={<IconActivity size={14} />}
            label="Frequency"
          />
          <TabButton
            active={tab === 'spectrogram'}
            onClick={() => setTab('spectrogram')}
            icon={<IconSpectrum size={14} />}
            label="Spectrogram"
          />
        </div>

        <div className="glass-raised rounded-xl h-40 overflow-hidden">
          {tab === 'frequency' ? (
            <FrequencyAnalyzer analyserNode={engine.analyserNode} isPlaying={engine.isPlaying} />
          ) : (
            <SpectrogramView audioBuffer={engine.decodedBuffer} isDecoding={engine.isDecoding} />
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors btn-focus-ring',
        active ? 'bg-gradient-to-r from-amber to-amber-deep text-void' : 'glass-raised text-ink-muted hover:text-ink',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
