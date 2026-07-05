import { Slider } from '@/components/ui/Slider';
import { ColorField } from '@/components/ui/ColorField';
import { ToggleField } from '@/components/ui/ToggleField';
import type { VisualizerConfig, VisualizerType } from '@/types/visualizer';

interface VisualizerControlPanelProps {
  type: VisualizerType;
  config: VisualizerConfig;
  onChange: (patch: Partial<VisualizerConfig>) => void;
}

export function VisualizerControlPanel({ type, config, onChange }: VisualizerControlPanelProps) {
  const showsRadius = type === 'circular-spectrum' || type === 'particle';

  return (
    <div className="space-y-5">
      <section>
        <h4 className="text-xs font-semibold text-ink uppercase tracking-wide mb-2.5">Color</h4>
        <div className="grid grid-cols-2 gap-3">
          <ColorField
            label="Primary"
            value={config.colorPrimary}
            onChange={(v) => onChange({ colorPrimary: v })}
          />
          <ColorField
            label="Secondary"
            value={config.colorSecondary}
            onChange={(v) => onChange({ colorSecondary: v })}
          />
        </div>
        <div className="mt-2.5">
          <ToggleField
            label="Use gradient"
            checked={config.useGradient}
            onChange={(v) => onChange({ useGradient: v })}
          />
        </div>
      </section>

      <section>
        <h4 className="text-xs font-semibold text-ink uppercase tracking-wide mb-2.5">Shape &amp; motion</h4>
        <div className="space-y-3">
          <Slider
            label="Thickness"
            value={config.thickness}
            min={1}
            max={20}
            unit="px"
            onChange={(v) => onChange({ thickness: v })}
          />
          <Slider
            label="Sensitivity"
            value={config.sensitivity}
            min={0.2}
            max={3}
            step={0.1}
            onChange={(v) => onChange({ sensitivity: v })}
          />
          {showsRadius && (
            <Slider
              label="Radius"
              value={config.radius}
              min={20}
              max={300}
              unit="px"
              onChange={(v) => onChange({ radius: v })}
            />
          )}
          <Slider
            label="Rotation"
            value={config.rotation}
            min={0}
            max={360}
            unit="°"
            onChange={(v) => onChange({ rotation: v })}
          />
          <Slider
            label="Rotation speed"
            value={config.rotationSpeed}
            min={0}
            max={60}
            unit="°/s"
            onChange={(v) => onChange({ rotationSpeed: v })}
          />
          <Slider
            label="Speed"
            value={config.speed}
            min={0.1}
            max={3}
            step={0.1}
            unit="×"
            onChange={(v) => onChange({ speed: v })}
          />
        </div>
      </section>

      {type === 'particle' && (
        <section>
          <h4 className="text-xs font-semibold text-ink uppercase tracking-wide mb-2.5">Particles</h4>
          <div className="space-y-3">
            <Slider
              label="Particle count"
              value={config.particleCount}
              min={20}
              max={500}
              step={10}
              onChange={(v) => onChange({ particleCount: v })}
            />
            <Slider
              label="Trail length"
              value={config.trailLength}
              min={0}
              max={100}
              unit="%"
              onChange={(v) => onChange({ trailLength: v })}
            />
          </div>
        </section>
      )}

      <section>
        <h4 className="text-xs font-semibold text-ink uppercase tracking-wide mb-2.5">Effects</h4>
        <div className="space-y-3">
          <Slider label="Glow" value={config.glow} min={0} max={100} unit="%" onChange={(v) => onChange({ glow: v })} />
          <Slider label="Blur" value={config.blur} min={0} max={20} unit="px" onChange={(v) => onChange({ blur: v })} />
          <Slider
            label="Opacity"
            value={Math.round(config.opacity * 100)}
            min={10}
            max={100}
            unit="%"
            onChange={(v) => onChange({ opacity: v / 100 })}
          />
          <Slider
            label="Motion blur"
            value={config.motionBlur}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onChange({ motionBlur: v })}
          />
          {type !== 'particle' && (
            <Slider
              label="Trail length"
              value={config.trailLength}
              min={0}
              max={100}
              unit="%"
              onChange={(v) => onChange({ trailLength: v })}
            />
          )}
          <Slider label="Bloom" value={config.bloom} min={0} max={100} unit="%" onChange={(v) => onChange({ bloom: v })} />
          <Slider
            label="Reflection"
            value={config.reflection}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onChange({ reflection: v })}
          />
          <Slider
            label="Refraction"
            value={config.refraction}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onChange({ refraction: v })}
          />
        </div>
      </section>

      <section>
        <h4 className="text-xs font-semibold text-ink uppercase tracking-wide mb-2.5">Shadow</h4>
        <div className="space-y-3">
          <ToggleField label="Drop shadow" checked={config.shadow} onChange={(v) => onChange({ shadow: v })} />
          {config.shadow && (
            <ColorField
              label="Shadow color"
              value={config.shadowColor}
              onChange={(v) => onChange({ shadowColor: v })}
            />
          )}
        </div>
      </section>
    </div>
  );
}
