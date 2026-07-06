import clsx from 'clsx';
import { VISUALIZER_LIBRARY, type VisualizerType } from '@/types/visualizer';

interface VisualizerTypePickerProps {
  selected: VisualizerType | null;
  onSelect: (type: VisualizerType) => void;
}

export function VisualizerTypePicker({ selected, onSelect }: VisualizerTypePickerProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {VISUALIZER_LIBRARY.map((entry) => (
        <button
          key={entry.type}
          onClick={() => onSelect(entry.type)}
          aria-pressed={selected === entry.type}
          className={clsx(
            'text-left p-3 rounded-xl border transition-colors btn-focus-ring',
            selected === entry.type
              ? 'border-teal bg-teal/10 text-ink'
              : 'border-void-line glass-raised text-ink-muted hover:text-ink hover:border-teal/30',
          )}
        >
          <p className="text-sm font-medium">{entry.label}</p>
          <p className="text-xs text-ink-dim mt-0.5 line-clamp-2">{entry.description}</p>
        </button>
      ))}
    </div>
  );
}
