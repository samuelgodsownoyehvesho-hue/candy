import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { IconChevronDown, IconCheck, IconClock } from '@/components/icons/Icons';
import clsx from 'clsx';

const FAQS = [
  {
    q: 'What audio formats can I upload?',
    a: 'MP3, WAV, FLAC, OGG, AAC, and M4A are all supported as project source tracks.',
  },
  {
    q: 'Where are my projects stored?',
    a: 'Locally in this browser, via localStorage. Nothing is uploaded to a server unless you explicitly export or use an AI feature that calls Grok. Use Settings → Export to back up your work.',
  },
  {
    q: 'Will lyric sync be automatic or manual?',
    a: 'Both. Cadence uses Grok to propose word and line-level sync automatically, and you can fine-tune or fully override any of it by hand on the timeline.',
  },
  {
    q: 'What happens if I clear my browser data?',
    a: 'Projects stored only in localStorage will be lost. Export important projects from Settings before clearing site data.',
  },
];

const ROADMAP = [
  { label: 'Core studio shell, project management, theming', done: true },
  { label: 'Audio engine — waveform, spectrogram, frequency analysis', done: false },
  { label: 'AI lyric sync (Grok) — word & line level, with manual override', done: false },
  { label: 'Timeline & multi-track editor', done: false },
  { label: 'Audio visualizers (30 types) + text effects + templates', done: false },
  { label: 'Export center — MP4/MOV/WebM/GIF up to 4K/60fps', done: false },
];

export function Help() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <AppShell title="Help">
      <div className="max-w-2xl mx-auto space-y-8">
        <section>
          <h2 className="font-display text-xl font-semibold text-ink mb-4">Frequently asked questions</h2>
          <div className="glass-panel rounded-2xl divide-y divide-void-line overflow-hidden">
            {FAQS.map((faq, i) => (
              <div key={faq.q}>
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left btn-focus-ring"
                  aria-expanded={openIndex === i}
                >
                  <span className="text-sm font-medium text-ink">{faq.q}</span>
                  <IconChevronDown
                    size={16}
                    className={clsx('text-ink-dim transition-transform shrink-0', openIndex === i && 'rotate-180')}
                  />
                </button>
                {openIndex === i && (
                  <p className="px-5 pb-4 text-sm text-ink-muted leading-relaxed">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ink mb-4">Build roadmap</h2>
          <div className="glass-panel rounded-2xl p-5 space-y-3">
            {ROADMAP.map((item) => (
              <div key={item.label} className="flex items-center gap-3 text-sm">
                {item.done ? (
                  <IconCheck size={16} className="text-teal shrink-0" />
                ) : (
                  <IconClock size={16} className="text-ink-dim shrink-0" />
                )}
                <span className={item.done ? 'text-ink' : 'text-ink-muted'}>{item.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
