import {
  IconPlay,
  IconPause,
  IconRewind,
  IconFastForward,
  IconVolume,
  IconVolumeMute,
} from '@/components/icons/Icons';

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  disabled?: boolean;
  onTogglePlay: () => void;
  onSeekBy: (deltaSeconds: number) => void;
  onVolumeChange: (v: number) => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PlaybackControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  disabled,
  onTogglePlay,
  onSeekBy,
  onVolumeChange,
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onSeekBy(-5)}
          disabled={disabled}
          aria-label="Rewind 5 seconds"
          className="btn-focus-ring p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-white/5 disabled:opacity-30 transition-colors"
        >
          <IconRewind size={16} />
        </button>
        <button
          onClick={onTogglePlay}
          disabled={disabled}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="btn-focus-ring h-10 w-10 rounded-full bg-gradient-to-br from-amber to-amber-deep text-void flex items-center justify-center disabled:opacity-30 hover:shadow-glow-amber transition-shadow"
        >
          {isPlaying ? <IconPause size={16} /> : <IconPlay size={16} />}
        </button>
        <button
          onClick={() => onSeekBy(5)}
          disabled={disabled}
          aria-label="Forward 5 seconds"
          className="btn-focus-ring p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-white/5 disabled:opacity-30 transition-colors"
        >
          <IconFastForward size={16} />
        </button>
      </div>

      <span className="readout text-ink-muted text-xs tabular-nums">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <div className="flex items-center gap-2 ml-auto min-w-[140px]">
        <button
          onClick={() => onVolumeChange(volume > 0 ? 0 : 0.85)}
          aria-label={volume > 0 ? 'Mute' : 'Unmute'}
          className="btn-focus-ring p-1 rounded-md text-ink-muted hover:text-ink transition-colors"
        >
          {volume > 0 ? <IconVolume size={15} /> : <IconVolumeMute size={15} />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          aria-label="Volume"
          className="flex-1 accent-teal h-1 cursor-pointer"
        />
      </div>
    </div>
  );
}
