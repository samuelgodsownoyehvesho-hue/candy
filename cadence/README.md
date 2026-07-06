# Cadence — AI Lyric Video Studio

Cadence is a browser-based studio for building AI-assisted lyric videos: upload a
track, let AI propose a sync/palette/template, refine everything by hand, and
export broadcast-ready video — all client-side.

This repository is being built in **slices**: each slice is a complete, tested,
deployable increment rather than a single all-at-once dump. That approach exists
because the full spec (30 audio visualizers, 40 lyric templates, a multi-track
timeline editor, full Groq AI integration, FFmpeg-WASM export, a template store,
etc.) is genuinely a multi-month product — building it all at once in one pass
is how you end up with code that *looks* complete but silently doesn't compile
or doesn't actually do what it claims. Building and verifying in real slices
avoids that.

## What's in this slice (Slice 4 — Lyric Editor)

Adds a real, AI-transcription-based lyric system to the project workspace.
This went through a mid-build architecture correction worth documenting
honestly: the first version of this slice used xAI's Grok (a text-only chat
model) to *guess* line pacing from line length and detected silence gaps,
since a text model can't literally hear vocals. Partway through, it became
clear the actual intent was **Groq** (a different company, at groq.com,
which hosts a fast Whisper speech-to-text model) — and Whisper genuinely
*can* listen to the track and return real, audio-derived word timestamps.
That's a strictly better foundation, so the feature was rebuilt around it
rather than kept as a guess dressed up as AI:

- **No typing or pasting lyrics required.** Tap "Transcribe lyrics with AI"
  and Groq's Whisper model (`whisper-large-v3`) listens to your already-
  uploaded track and returns real segment + word-level timestamps —
  genuinely derived from the audio, not estimated from text
- **A review list, not a drag timeline.** Detected lines appear as a
  scrollable list of editable text boxes with a timestamp range on each —
  this mirrors the pattern real lyric-video tools use, and is dramatically
  better on a touchscreen than fine-grained pixel dragging. Small +/- nudge
  buttons handle the rare case a line's boundary needs a small manual
  correction; there's no separate word-level drag view, since Whisper's
  timestamps are generally already accurate — what actually needs fixing is
  Whisper occasionally mishearing a word, which is a text-edit problem, not
  a timing one
- **The Groq API key is server-side only** (`GROQ_API_KEY`), proxied through
  a Vercel serverless function (`api/whisper-transcribe.js`) — the key never
  reaches the browser. Audio uploads directly from the browser to **Vercel
  Blob storage** (`api/audio-upload.js`), then the transcribe function
  fetches it server-side and forwards it to Groq's `audio/transcriptions`
  endpoint requesting both segment- and word-level timestamps, grouping the
  flat word list under the correct line
- **Bypasses Vercel's request-body limit properly.** An earlier version of
  this sent audio as base64 JSON directly through the serverless function,
  capped at ~3.2MB to stay under Vercel's 4.5MB body limit. Routing the
  upload through Vercel Blob storage instead means audio never passes
  through that function's request body at all — the practical ceiling is
  now Groq's own ~25MB Whisper API limit, not a Vercel-specific one
- **Manual fallback**: if transcription fails, is unavailable (e.g. no API
  key set, no Blob store connected, or running plain `vite dev` locally with
  no serverless runtime), or you just want to add a line by hand, "+ Add
  line" creates a blank, editable entry positioned after the last line
- **A live karaoke-style preview** highlighting the current word/line as
  your track plays, using Whisper's real per-word timestamps
- **Fixed a real light-mode bug**: `theme-light:` was being used throughout
  as if it were a Tailwind variant, but it was never registered as one —
  meaning every light-mode color override silently did nothing, and the
  light theme rendered using dark-tuned text colors on a light background
  (washed out, low contrast). Fixed by making the core color tokens
  (`void`, `ink`) genuinely theme-reactive via CSS custom properties defined
  in `index.css`, so they adapt automatically everywhere without needing a
  variant class on every element
- **Fixed transcription silently hanging**: `vercel.json` never configured
  a `maxDuration` for the serverless functions, so they were running under
  Vercel's short default execution limit — a real song easily takes longer
  than that to fetch, send to Groq, and transcribe, so the function was
  likely being killed mid-request with no clean response reaching the
  browser (looks exactly like an infinite "Transcribing…" spinner). Fixed
  by explicitly setting `maxDuration: 60` for `whisper-transcribe.js`
  (Vercel Hobby's confirmed max) and adding a client-side 55-second timeout
  so a genuine hang now surfaces a clear error instead of spinning forever

**Also fixed in this slice:** a 404-on-refresh bug on Vercel deployments —
Slice 1 shipped `netlify.toml`'s SPA redirect rule but never added the
Vercel equivalent (`vercel.json`), which anyone deploying to Vercel instead
of Netlify would have hit on any deep link or page refresh.

**Verified, not assumed:** `tsc --noEmit` clean, `vite build` clean, 38/38
Vitest tests passing (covering word-time distribution and the
word-into-segment grouping logic against known inputs), ESLint clean across
both the TS/TSX app code and the new JS serverless function.

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
| 4 ✅ | Lyric Editor — AI transcription via Groq Whisper (real audio-derived timestamps, no typing lyrics), reviewable/editable list with timing nudge buttons |
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
│  ├─ audio-upload.js           # Vercel Blob client-upload token handshake
│  └─ whisper-transcribe.js     # Vercel serverless function — proxies Groq
│                                # Whisper, keeps GROQ_API_KEY server-side only
├─ public/
│  └─ favicon.svg
├─ src/
│  ├─ components/
│  │  ├─ audio/                 # AudioEnginePanel, WaveformView, PlaybackControls,
│  │  │                          # FrequencyAnalyzer, SpectrogramView
│  │  ├─ lyrics/                # LyricsPanel, LyricGeneratePanel (transcribe
│  │  │                          # trigger), LyricReviewList (tap-to-edit +
│  │  │                          # nudge buttons), LyricPreview
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
│  │  ├─ groqClient.ts          # client-side caller for /api/whisper-transcribe
│  │  ├─ lyrics.ts              # word-time distribution + word-into-segment grouping
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
this slice, since `api/whisper-transcribe.js` uses Vercel's zero-config serverless
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
**Note:** `api/whisper-transcribe.js` is written using Vercel's serverless
function convention — deploying to Netlify instead would need that endpoint
reimplemented as a Netlify Function (different file location and handler
signature). Until that's done, AI lyric transcription simply won't be
available on Netlify (the manual "+ Add line" flow still works everywhere).

## Groq API setup

The Groq Whisper integration is real and working, proxied through
`api/whisper-transcribe.js` so the API key never reaches the browser.

**Audio upload architecture (updated):** the first version of this feature
sent audio to the serverless function as base64 JSON, capped at ~3.2MB to
stay under Vercel's 4.5MB request-body limit. That was a real, hard
constraint — not a bug — so it's been replaced with a proper fix: audio now
uploads **directly from the browser to Vercel Blob storage** (via
`api/audio-upload.js`, using Vercel's documented client-upload token
handshake), completely bypassing the serverless function body-size limit.
`api/whisper-transcribe.js` then fetches the file server-side from Blob
storage and forwards it to Groq — server-to-server fetches aren't subject
to that same client request-body cap. The practical ceiling is now Groq's
own Whisper API limit (~25MB) rather than Vercel's.

**Setup — two things needed, both in your Vercel dashboard:**

1. **Groq API key**: get one from [console.groq.com](https://console.groq.com),
   then add it as `GROQ_API_KEY` (no `VITE_` prefix — see why below) under
   **Project Settings → Environment Variables**.
2. **Vercel Blob store**: go to your project's **Storage** tab → **Create
   Database** → **Blob** → connect it to this project. Vercel automatically
   injects `BLOB_READ_WRITE_TOKEN` into your deployment once connected — you
   don't need to copy/paste this one yourself.

Redeploy after adding these (Vercel does not automatically redeploy just
because you added an environment variable or connected storage — you need
to trigger a new deployment, e.g. via **Deployments → ⋯ → Redeploy**, or
by pushing a new commit).

**Why no `VITE_` prefix on the Groq key:** any `VITE_*` variable gets
bundled into the client-side JS and is publicly visible in the browser —
fine for things like a base URL, not fine for a billable API key.
`GROQ_API_KEY` is read server-side only, inside `api/whisper-transcribe.js`,
via `process.env`.

**One thing worth flagging honestly:** the Vercel Blob client-upload
handshake (`api/audio-upload.js` + `@vercel/blob/client`'s `upload()` on the
client side) is implemented against Vercel's documented pattern, but this
specific piece — the token handshake talking to live Blob storage — can
only be verified end-to-end on an actual Vercel deployment; there's no way
to simulate real Vercel Blob storage in a local sandbox. Everything else in
this repo (`tsc`, `vite build`, the full Vitest suite, ESLint) has been run
and passes, but this one integration point needs your live deployment to
confirm it end-to-end. If "Transcribe lyrics with AI" errors specifically
during the *upload* step (rather than the transcription step), that's the
first place to look — check the browser console for the exact error and
the function logs in Vercel's dashboard.

**Local development:** plain `npm run dev` (via Vite) does not run
serverless functions, so neither `/api/audio-upload` nor
`/api/whisper-transcribe` exist locally that way — AI transcription will
show a clear error, and you can still add lines manually via "+ Add line".
To test the real path locally, use the Vercel CLI's `vercel dev` instead
(with `vercel env pull` to get `BLOB_READ_WRITE_TOKEN` and `GROQ_API_KEY`
into a local `.env`).

## Troubleshooting

- **`npm install` fails on a fresh clone** — confirm Node 20+ (`node -v`).
  Older Node versions aren't tested against this dependency set.
- **Blank page after `npm run build` + `npm run preview`** — check the browser
  console for a startup error.
- **404 on refresh / deep link (Vercel)** — confirm `vercel.json`'s
  `rewrites` block wasn't stripped.
- **404 on refresh / deep link (Netlify)** — confirm the
  `[[redirects]]` block in `netlify.toml` wasn't stripped.
- **"Transcribe lyrics with AI" says the server has no Groq API key, even
  though you set one** — the most common cause: Vercel does not
  automatically redeploy just because you added or changed an environment
  variable. Go to **Deployments → (latest) → ⋯ → Redeploy** after adding
  `GROQ_API_KEY` or connecting a Blob store. Also double-check the exact
  spelling (`GROQ`, not `GROK`) and that the key came from
  [console.groq.com](https://console.groq.com), not a different provider's
  console.
- **"Transcribe lyrics with AI" errors during upload specifically** —
  confirm a Blob store is connected under your Vercel project's **Storage**
  tab; without one, `BLOB_READ_WRITE_TOKEN` won't exist and the upload step
  will fail before it ever reaches Groq.
- **"Transcribe lyrics with AI" hangs / spins forever** — should now
  surface a clear timeout error after ~55 seconds instead. If it still just
  hangs, check **Vercel's dashboard → your project → the specific
  deployment → Functions/Logs tab** for `whisper-transcribe` — that's where
  the actual runtime error or timeout will show. A local terminal (Acode,
  Termux, etc.) has no visibility into your live Vercel deployment's
  runtime at all; it only sees your local files and git.
- **A 413 error during transcription** — the file exceeded Groq's own
  ~25MB Whisper API limit; try a shorter clip or a more compressed format.
- **Light mode looked broken/washed out in an earlier build** — this was a
  real bug (see the Slice 4 notes above): `theme-light:` was never a valid
  Tailwind variant, so light-mode color overrides silently did nothing. This
  is fixed as of this update; if you still see it, confirm you're on the
  latest deployed commit.
- **Theme flashes the wrong mode on load** — this is a known tradeoff of
  client-side theme detection without SSR; it self-corrects within one paint
  and doesn't affect functionality.
- **Local projects "disappeared"** — they live in this browser's
  `localStorage` only. Clearing site data, using a different browser, or
  private/incognito mode will not show previously created projects. Use
  Settings → Export all projects to back up before clearing browser data.

## License

Proprietary — all rights reserved by the project owner.
