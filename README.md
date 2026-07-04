# Cadence — AI Lyric Video Studio

Cadence is a browser-based studio for building AI-assisted lyric videos: upload a
track, let AI propose a sync/palette/template, refine everything by hand, and
export broadcast-ready video — all client-side.

This repository is being built in **slices**: each slice is a complete, tested,
deployable increment rather than a single all-at-once dump. That approach exists
because the full spec (30 audio visualizers, 40 lyric templates, a multi-track
timeline editor, full Grok AI integration, FFmpeg-WASM export, a template store,
etc.) is genuinely a multi-month product — building it all at once in one pass
is how you end up with code that *looks* complete but silently doesn't compile
or doesn't actually do what it claims. Building and verifying in real slices
avoids that.

## What's in this slice (Slice 4 — Lyric Editor)

Adds a real lyric-sync system to the project workspace. One honest scoping
note up front: **Grok is a text model, not an audio-listening one** — it
can't literally hear your vocals to detect exact word timestamps the way a
speech-to-text model would. So rather than oversell that, here's the actual
(genuinely useful) architecture:

- **Real signal analysis** (`src/lib/audioAnalysis.ts`) computes an RMS
  energy envelope from your track's actual decoded audio and detects
  sustained low-energy stretches (intros, instrumental breaks, outros) —
  real DSP, unit-tested against synthetic signals with known gaps
- **Grok proposes line-level pacing** via a Vercel serverless function
  (`api/grok-sync.js`), informed by that silence-gap data, each line's
  length, and the track's duration — so lines land at sensible times and
  never overlap a detected instrumental gap
- **Word-level timing is derived deterministically** (`buildWordsForLine`)
  from each line's proposed range, weighted by word length — this is local
  math, not an AI guess, and is exactly what a person is expected to
  fine-tune by hand afterward
- **A deterministic fallback** (`naiveProportionalTimings`) kicks in
  automatically if Grok is unreachable — including when running plain
  `vite dev` locally with no serverless runtime — so the feature works
  end-to-end either way; the UI is explicit about which one produced the
  current sync
- **Full manual override**: drag any line's body to move it, drag its edges
  to resize it, or select a line to drag its individual words — pointer-based
  timeline editing, plus arrow-key nudging for keyboard accessibility
- **A live karaoke-style preview** highlighting the current word/line as your
  track plays
- **The Grok API key is server-side only** (`GROK_API_KEY`, not
  `VITE_GROK_API_KEY`) — it's read by the Vercel serverless function via
  `process.env` and never ships in the client bundle. This corrects a gap
  flagged (but not yet fixed) in earlier slices.

**Also fixed in this slice:** a 404-on-refresh bug on Vercel deployments —
Slice 1 shipped `netlify.toml`'s SPA redirect rule but never added the
Vercel equivalent (`vercel.json`), which anyone deploying to Vercel instead
of Netlify would have hit on any deep link or page refresh.

**Verified, not assumed:** `tsc --noEmit` clean, `vite build` clean, 43/43
Vitest tests passing (including a test that caught and fixed a real bug in
the fallback timing algorithm, where a line's reported time range could
visually straddle a silence gap even though no time was actually spent
inside it), ESLint clean across both the TS/TSX app code and the new
JS serverless function.

## What's in Slice 3 (First Audio Visualizers)

Adds a real visualizer system to the project workspace, appearing once a
track is uploaded:

- **4 working visualizer types**: Waveform (oscilloscope-style line),
  Spectrum Bars, Circular Spectrum (rotating ring of bars), and Particle
  (a field of particles that pulses outward with the beat and leaves trails)
- **The full 17-property control set** from the spec, wired for real on
  every type: primary/secondary color with gradient toggle, glow, blur,
  thickness, sensitivity, radius, rotation, rotation speed, animation speed,
  opacity, drop shadow (+ color), motion blur (trail smear), bloom,
  reflection, refraction, particle count, and trail length
- **Shared rendering architecture**: a single `VisualizerCanvas` component
  owns the rAF loop and a generic post-processing pipeline (trail decay,
  bloom, reflection, refraction banding, blur, drop shadow) that every
  visualizer type plugs into — this is the exact pattern the remaining 26
  visualizer types will follow, so adding each one going forward is a new
  entry in `VISUALIZER_LIBRARY` plus one draw function in
  `lib/visualizerEngine.ts`, not a new rendering pipeline
- **Live audio-reactive preview**: shares the same `AnalyserNode` the Audio
  Engine panel already created (one Web Audio graph, not a second
  competing one) — the visualizer genuinely reacts to your track as it
  plays, and idles with gentle synthetic motion when paused
- **Persisted per project**: visualizer type and every control value save
  automatically (debounced) to the project, same as audio metadata

**Verified, not assumed:** `tsc -b` clean, `vite build` clean, 26/26 Vitest
tests passing (color interpolation math, visualizer default configs), ESLint
clean.

## What's in Slice 2 (Audio Engine)

- **Waveform playback** via WaveSurfer.js — click-to-seek, play/pause,
  rewind/forward 5s, volume with mute toggle, live time readout
- **Live frequency analyzer** — a genuine Web Audio `AnalyserNode` tapped off
  the WaveSurfer media element, rendered as log-scale grouped bars so bass
  detail isn't crushed into the first two bars
- **Real FFT spectrogram** — a from-scratch radix-2 Cooley-Tukey FFT
  (`src/lib/fft.ts`, unit-tested against a known sine-wave peak) computed in a
  Web Worker (`src/workers/spectrogram.worker.ts`) so a multi-minute track
  doesn't block the UI thread
- **IndexedDB persistence** for the uploaded audio blob itself

## What's in Slice 1 (Core Studio Shell)

- Vite + React 18 + TypeScript + Tailwind, strict mode, fully typed
- Dark/light theme with system-preference detection and persistence
- Routing: Splash → Landing → Dashboard → My Projects → Project workspace,
  plus Settings, Help, About
- Full project CRUD: create, rename, duplicate, delete, archive/restore,
  import (.json), export (.json), auto-save, linear version history
- Keyboard shortcut (`Ctrl/Cmd+N` → new project), visible focus rings,
  `prefers-reduced-motion` respected throughout
- Responsive: mobile drawer nav, tablet, desktop sidebar

**Not yet built** (tracked transparently in the in-app Help → Build
roadmap, and in the table below): the timeline/multi-track editor, the
remaining 26 audio visualizers, the 40 lyric templates, text/camera effects,
transitions, the Template Store, Asset Library, and the Export Center
(FFmpeg-WASM). These are the next slices, built in this order:

| Slice | Scope |
|---|---|
| 1 ✅ | Core shell, routing, theme, project CRUD |
| 2 ✅ | Audio engine — waveform (WaveSurfer.js), spectrogram (FFT + Web Worker), frequency analyzer, IndexedDB persistence |
| 3 ✅ | First 4 audio visualizers (Waveform, Spectrum Bars, Circular Spectrum, Particle) with the full 17-property control set — shared rendering pattern for the remaining 26 |
| 4 ✅ | Lyric Editor — Grok-assisted line sync (via a secure serverless proxy) with full manual drag-to-edit override, deterministic fallback when AI is unavailable |
| 5 | Timeline/multi-track editor — trim, split, merge, keyframes, undo/redo, snap guides |
| 6 | Export Center — FFmpeg-WASM, MP4/MOV/WebM/GIF, 720p–4K, 24/30/60fps, background export, retry/cancel, progress |
| 7 | Template Store, Asset Library, remaining 26 visualizers/40 templates, polish pass |

## Design system

"Cadence" leans into its subject — an audio tool — rather than a generic AI-app
look: a near-black control-room palette (`#0C0E11`) with two structured accents
(console amber `#E8A33D`, signal teal `#3FE8C9`), Space Grotesk for display type,
Inter for body, and JetBrains Mono for readouts (timecodes, BPM, dB). The
signature element is an ambient, believable VU-meter animation (canvas, not a
GIF) used on the splash screen, landing hero, and dashboard — it's meant to feel
like a real signal chain, not decoration.

## Folder structure

```
cadence/
├─ api/
│  └─ grok-sync.js             # Vercel serverless function — proxies Grok,
│                                # keeps GROK_API_KEY server-side only
├─ public/
│  └─ favicon.svg
├─ src/
│  ├─ components/
│  │  ├─ audio/                 # AudioEnginePanel, WaveformView, PlaybackControls,
│  │  │                          # FrequencyAnalyzer, SpectrogramView
│  │  ├─ lyrics/                # LyricsPanel, LyricInputPanel,
│  │  │                          # LyricTimelineEditor (drag-to-edit), LyricPreview
│  │  ├─ visualizer/            # VisualizerPanel, VisualizerCanvas (rAF loop +
│  │  │                          # post-processing pipeline), VisualizerTypePicker,
│  │  │                          # VisualizerControlPanel
│  │  ├─ icons/Icons.tsx        # shared SVG icon set (no emoji anywhere)
│  │  ├─ layout/                # AppShell, Sidebar, Topbar (+ mobile drawer)
│  │  └─ ui/                    # Button, Modal, ProjectCard, StatusBadge,
│  │                             # Slider, ColorField, ToggleField, AmbientMeter
│  ├─ context/
│  │  ├─ ThemeContext.tsx       # dark/light, persisted
│  │  └─ ProjectContext.tsx     # full project CRUD + autosave + versioning
│  ├─ hooks/
│  │  ├─ useAudioEngine.ts      # WaveSurfer + Web Audio analyser + decode
│  │  └─ useKeyboardShortcuts.ts
│  ├─ lib/
│  │  ├─ audioAnalysis.ts       # RMS energy envelope + silence-gap detection
│  │  ├─ audioDb.ts             # IndexedDB wrapper for uploaded audio blobs
│  │  ├─ color.ts                # hex/rgb/lerp color helpers
│  │  ├─ fft.ts                 # radix-2 Cooley-Tukey FFT + Hann window
│  │  ├─ grokClient.ts          # client-side caller for /api/grok-sync
│  │  ├─ lyrics.ts              # parsing, word-timing distribution, sync orchestration
│  │  ├─ visualizerEngine.ts    # per-type canvas draw functions + particle system
│  │  └─ storage.ts             # defensive localStorage wrapper
│  ├─ pages/                    # Splash, Landing, Dashboard, Projects,
│  │                             # ProjectWorkspace, Settings, Help, About
│  ├─ test/                     # Vitest unit tests + jsdom setup
│  ├─ types/
│  │  ├─ project.ts             # full Project data model (forward-typed for
│  │  │                          # later slices: templates, timeline)
│  │  ├─ lyrics.ts              # LyricLine, LyricWord, LyricsDocument
│  │  └─ visualizer.ts          # VisualizerType, VisualizerConfig, defaults
│  ├─ workers/
│  │  └─ spectrogram.worker.ts  # off-main-thread FFT spectrogram computation
│  ├─ App.tsx                   # router
│  ├─ main.tsx                  # entry point
│  └─ styles/index.css          # Tailwind layers + design tokens
├─ index.html
├─ package.json
├─ vite.config.ts               # includes Vitest config + COOP/COEP headers
│                                 # (required later for FFmpeg-WASM)
├─ tailwind.config.js           # full color/type/animation token system
├─ tsconfig.json
├─ netlify.toml                 # SPA redirect + COOP/COEP headers, for Netlify
├─ vercel.json                  # SPA rewrite (excluding /api/*), for Vercel
├─ .env.example
├─ .eslintrc.cjs / .prettierrc
└─ .gitignore
```

## Installation

Requires Node.js 20+.

```bash
git clone <your-repo-url> cadence
cd cadence
npm install
cp .env.example .env
```

## Development

```bash
npm run dev
```

Opens at `http://localhost:5173`. Hot reload is enabled for all source files.

## Production build

```bash
npm run build      # type-checks (tsc -b) then builds to dist/
npm run preview    # serve the production build locally to sanity-check it
```

## Testing & linting

```bash
npm test           # run the Vitest suite once
npm run test:watch # watch mode
npm run lint        # ESLint, zero warnings tolerated in CI
npm run format       # Prettier write
```

## Deployment (Vercel or Netlify)

This repo deploys cleanly to either. **Vercel is the primary target** as of
this slice, since `api/grok-sync.js` uses Vercel's zero-config serverless
functions convention (any file under `/api` automatically becomes an
endpoint — no extra setup needed).

### Vercel

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project**, import the repo. Vercel auto-detects
   the Vite build (`npm run build`, output `dist`).
3. Add `GROK_API_KEY` (and optionally `GROK_API_BASE_URL` / `GROK_MODEL`) in
   **Project Settings → Environment Variables** before deploying — the lyric
   sync feature falls back to a local deterministic algorithm without it, so
   the app won't be broken if you skip this, but AI sync won't work.
4. Deploy. `vercel.json` handles the SPA rewrite (so `/projects/abc123`
   works on refresh instead of 404ing) and explicitly excludes `/api/*` from
   that rewrite so the serverless function keeps working.

### Netlify

`netlify.toml` is also configured (build command, publish dir, SPA
redirect, and the COOP/COEP headers FFmpeg-WASM will need in a later slice).
**Note:** `api/grok-sync.js` is written using Vercel's serverless function
convention — deploying to Netlify instead would need that endpoint
reimplemented as a Netlify Function (different file location and handler
signature). Until that's done, lyric sync running on Netlify will always use
the local deterministic fallback, not Grok.

## Grok API setup

The Grok integration is real and working as of Slice 4, proxied through
`api/grok-sync.js` so the API key never reaches the browser:

1. Get an API key from [console.x.ai](https://console.x.ai).
2. Set it as `GROK_API_KEY` (no `VITE_` prefix — see why below) in Vercel's
   environment variables, or in a local `.env` file if using `vercel dev`.
3. `GROK_API_BASE_URL` and `GROK_MODEL` have sensible defaults in
   `.env.example` — override only if xAI changes their endpoint or you want a
   different model.

**Why no `VITE_` prefix:** any `VITE_*` variable gets bundled into the
client-side JS and is publicly visible in the browser — fine for things like
a base URL, not fine for a billable API key. `GROK_API_KEY` is read
server-side only, inside `api/grok-sync.js`, via `process.env`. An earlier
slice's README flagged this as a "should fix later" — this is that fix.

**Local development:** plain `npm run dev` (via Vite) does not run
serverless functions, so `/api/grok-sync` won't exist locally that way —
lyric sync will automatically use the deterministic fallback algorithm
instead, and the UI clearly indicates which one produced the current sync.
To test the real Grok path locally, use the Vercel CLI's `vercel dev`
instead, which emulates the serverless environment.

## Troubleshooting

- **`npm install` fails on a fresh clone** — confirm Node 20+ (`node -v`).
  Older Node versions aren't tested against this dependency set.
- **Blank page after `npm run build` + `npm run preview`** — check the browser
  console for a startup error.
- **404 on refresh / deep link (Vercel)** — confirm `vercel.json`'s
  `rewrites` block wasn't stripped.
- **404 on refresh / deep link (Netlify)** — confirm the
  `[[redirects]]` block in `netlify.toml` wasn't stripped.
- **Lyric sync always says "local timing algorithm" even with a Grok key
  set** — confirm `GROK_API_KEY` (not `VITE_GROK_API_KEY`) is set in your
  deployment's environment variables, and that you're deploying to Vercel
  (or running `vercel dev` locally) rather than plain Netlify/`vite dev`,
  neither of which currently execute `api/grok-sync.js`.
- **Theme flashes the wrong mode on load** — this is a known tradeoff of
  client-side theme detection without SSR; it self-corrects within one paint
  and doesn't affect functionality.
- **Local projects "disappeared"** — they live in this browser's
  `localStorage` only. Clearing site data, using a different browser, or
  private/incognito mode will not show previously created projects. Use
  Settings → Export all projects to back up before clearing browser data.

## License

Proprietary — all rights reserved by the project owner.
