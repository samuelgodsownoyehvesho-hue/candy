import { useEffect, useState } from 'react';
import { VisualizerCanvas } from '@/components/visualizer/VisualizerCanvas';
import { VisualizerTypePicker } from '@/components/visualizer/VisualizerTypePicker';
import { VisualizerControlPanel } from '@/components/visualizer/VisualizerControlPanel';
import { createDefaultVisualizerConfig, type VisualizerConfig, type VisualizerType } from '@/types/visualizer';
import type { ProjectVisualizerSettings } from '@/types/project';
import { useProjects } from '@/context/ProjectContext';

interface VisualizerPanelProps {
  projectId: string;
  savedSettings: ProjectVisualizerSettings | null;
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
}

export function VisualizerPanel({ projectId, savedSettings, analyserNode, isPlaying }: VisualizerPanelProps) {
  const { updateProjectVisualizer } = useProjects();
  const [type, setType] = useState<VisualizerType | null>(savedSettings?.type ?? null);
  const [config, setConfig] = useState<VisualizerConfig>(
    savedSettings?.config ?? createDefaultVisualizerConfig('waveform'),
  );

  // Debounced persistence — every slider tick calls onChange, and writing to
  // localStorage on each one would both spam disk I/O and thrash re-renders
  // across the whole ProjectContext tree.
  useEffect(() => {
    if (!type) return;
    const timer = window.setTimeout(() => {
      updateProjectVisualizer(projectId, { type, config });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [type, config, projectId, updateProjectVisualizer]);

  function handleSelectType(next: VisualizerType) {
    setType(next);
    if (!savedSettings || savedSettings.type !== next) {
      setConfig(createDefaultVisualizerConfig(next));
    }
  }

  return (
    <div className="space-y-4">
      <VisualizerTypePicker selected={type} onSelect={handleSelectType} />

      {type && (
        <div className="grid lg:grid-cols-[1fr_260px] gap-4">
          <div className="glass-raised rounded-xl h-64 overflow-hidden">
            <VisualizerCanvas
              type={type}
              config={config}
              analyserNode={analyserNode}
              isPlaying={isPlaying}
              className="w-full h-full block"
            />
          </div>
          <div className="glass-raised rounded-xl p-4 max-h-[420px] overflow-y-auto">
            <VisualizerControlPanel
              type={type}
              config={config}
              onChange={(patch) => setConfig((prev) => ({ ...prev, ...patch }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
