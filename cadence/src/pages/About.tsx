import { AppShell } from '@/components/layout/AppShell';
import { AmbientMeter } from '@/components/ui/AmbientMeter';
import { IconWaveform, IconSparkles, IconLayers, IconExport } from '@/components/icons/Icons';

const PRINCIPLES = [
  {
    icon: IconWaveform,
    title: 'Audio first',
    body: 'Every visual decision in Cadence is derived from the track itself — waveform, frequency content, and tempo drive the page, not the other way around.',
  },
  {
    icon: IconSparkles,
    title: 'AI proposes, you decide',
    body: 'Groq handles the tedious first pass — sync, palette, font, mood — but nothing is locked. Every AI suggestion is an editable starting point.',
  },
  {
    icon: IconLayers,
    title: 'Transparent pipeline',
    body: 'No black boxes. The signal chain from upload to export is visible and editable at every stage.',
  },
  {
    icon: IconExport,
    title: 'Runs in your browser',
    body: 'Encoding happens client-side via FFmpeg WebAssembly — your audio and footage never have to leave your machine to render.',
  },
];

export function About() {
  return (
    <AppShell title="About">
      <div className="max-w-3xl mx-auto">
        <div className="relative glass-panel rounded-2xl p-8 md:p-10 mb-8 overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 h-20 opacity-15 pointer-events-none">
            <AmbientMeter bars={48} energy={0.5} />
          </div>
          <div className="relative">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber to-teal flex items-center justify-center mb-5">
              <IconWaveform size={22} className="text-void" />
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-semibold text-ink mb-3">
              Cadence is a studio, not a template factory.
            </h1>
            <p className="text-ink-muted leading-relaxed max-w-xl">
              Built for creators who want lyric videos that actually sound like
              their track looks — synced to the beat, shaped by AI, finished by hand.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="glass-panel rounded-2xl p-5">
              <p.icon size={18} className="text-amber mb-3" />
              <h3 className="font-display font-semibold text-ink mb-1.5">{p.title}</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
