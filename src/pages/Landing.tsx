import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AmbientMeter } from '@/components/ui/AmbientMeter';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/context/ThemeContext';
import {
  IconWaveform,
  IconSparkles,
  IconLayers,
  IconExport,
  IconSun,
  IconMoon,
  IconArrowRight,
  IconPlay,
} from '@/components/icons/Icons';

const PIPELINE_STAGES = [
  {
    label: 'Input',
    title: 'Drop in your track',
    body: 'MP3, WAV, FLAC, OGG, AAC, or M4A — Cadence reads the waveform and frequency content the moment it lands.',
    icon: IconWaveform,
  },
  {
    label: 'Analysis',
    title: 'AI reads the signal',
    body: 'Grok detects BPM, key mood, and genre, then proposes a synced lyric timing, palette, and font pairing.',
    icon: IconSparkles,
  },
  {
    label: 'Build',
    title: 'Shape it your way',
    body: 'Refine AI sync by hand on the timeline, swap templates, layer visualizers and backgrounds — full manual control whenever you want it.',
    icon: IconLayers,
  },
  {
    label: 'Output',
    title: 'Export broadcast-ready',
    body: 'Render to MP4, MOV, WebM, or GIF up to 4K at 60fps, right from the browser.',
    icon: IconExport,
  },
];

export function Landing() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-void theme-light:bg-paper text-ink theme-light:text-inkLight">
      <header className="sticky top-0 z-30 glass-panel border-b border-void-line">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber to-teal flex items-center justify-center">
              <IconWaveform size={16} className="text-void" />
            </div>
            <span className="font-display font-semibold text-lg">Cadence</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="btn-focus-ring p-2.5 rounded-xl glass-raised text-ink-muted hover:text-ink transition-colors"
            >
              {theme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
            </button>
            <Button size="sm" onClick={() => navigate('/dashboard')}>
              Open studio
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-20 md:pb-28">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="readout text-amber px-3 py-1 rounded-full border border-amber/30 bg-amber/5">
              AI LYRIC SYNC · ENGINE V1
            </span>
            <h1 className="mt-5 font-display text-4xl md:text-6xl font-semibold leading-[1.05] tracking-tight">
              Lyrics that move
              <br />
              with the <span className="text-gradient-signal">signal</span>.
            </h1>
            <p className="mt-5 text-ink-muted theme-light:text-inkLight-muted text-base md:text-lg max-w-md">
              Cadence listens to your track, syncs every word, and renders a
              cinematic lyric video — guided by AI, finished by hand.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={() => navigate('/dashboard')} iconRight={<IconArrowRight size={18} />}>
                Start a project
              </Button>
              <Button size="lg" variant="secondary" onClick={() => navigate('/projects')} iconLeft={<IconPlay size={16} />}>
                See my projects
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative glass-panel rounded-2xl p-6 h-72 md:h-80 flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="readout text-ink-dim">CHANNEL OUTPUT</span>
              <span className="readout text-teal">-3.2 dB</span>
            </div>
            <div className="flex-1">
              <AmbientMeter bars={36} energy={0.8} />
            </div>
            <div className="mt-4 flex items-center justify-between text-xs readout text-ink-dim">
              <span>00:42.180</span>
              <span>128 BPM</span>
              <span>A MINOR</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pipeline / signature structural device: a signal chain, not numbered steps for their own sake */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-20 md:pb-28">
        <h2 className="font-display text-2xl md:text-3xl font-semibold mb-2">
          One signal chain, start to export
        </h2>
        <p className="text-ink-muted theme-light:text-inkLight-muted mb-10 max-w-lg">
          Every project moves through the same four stages of the chain — each one visible and editable, never a black box.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PIPELINE_STAGES.map((stage, i) => (
            <motion.div
              key={stage.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glass-panel rounded-2xl p-5 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span className="readout text-amber">{stage.label}</span>
                <stage.icon size={18} className="text-teal" />
              </div>
              <h3 className="font-display font-semibold text-ink">{stage.title}</h3>
              <p className="text-sm text-ink-muted theme-light:text-inkLight-muted leading-relaxed">
                {stage.body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-24">
        <div className="glass-panel rounded-3xl p-10 md:p-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-semibold mb-2">
              Your next lyric video starts with one upload.
            </h2>
            <p className="text-ink-muted theme-light:text-inkLight-muted max-w-md">
              No card required to start building — bring your track and your words.
            </p>
          </div>
          <Button size="lg" onClick={() => navigate('/dashboard')} iconRight={<IconArrowRight size={18} />}>
            Open the studio
          </Button>
        </div>
      </section>

      <footer className="border-t border-void-line py-8">
        <div className="max-w-6xl mx-auto px-5 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-ink-dim">
          <span>© {new Date().getFullYear()} Cadence Studio</span>
          <div className="flex items-center gap-5">
            <button onClick={() => navigate('/about')} className="hover:text-ink transition-colors">About</button>
            <button onClick={() => navigate('/help')} className="hover:text-ink transition-colors">Help</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
