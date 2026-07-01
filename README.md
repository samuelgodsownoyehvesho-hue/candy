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

## What's in this slice (Slice 1 — Core Studio Shell)

- Vite + React 18 + TypeScript + Tailwind, strict mode, fully typed
- Dark/light theme with system-preference detection and persistence
- Routing: Splash → Landing → Dashboard → My Projects → Project workspace,
  plus Settings, Help, About
- Full project CRUD: create, rename, duplicate, delete, archive/restore,
  import (.json), export (.json, single project or all projects),
  auto-save (debounced, to `localStorage`), linear version history
- Audio source upload (MP3/WAV/FLAC/OGG/AAC/M4A) with format validation and
  duration detection — feeds the upcoming Audio Engine slice
- Keyboard shortcut (`Ctrl/Cmd+N` → new project), visible focus rings,
  `prefers-reduced-motion` respected throughout
- Responsive: mobile drawer nav, tablet, desktop sidebar
- A real, working Vitest suite (`npm test`) and a clean ESLint pass
- Verified: `tsc -b` clean, `vite build` clean, all tests passing

**Not yet built** (tracked transparently in the in-app Help → Build roadmap, and
in the table below): waveform/spectrogram display, Grok AI integration (sync,
BPM/mood/genre detection, palette/font/animation recommendations), the 30 audio
visualizers, the 40 lyric templates, the timeline/multi-track editor, text/camera
effects, transitions, the Template Store, Asset Library, and the Export Center
(FFmpeg-WASM). These are the next slices, built in this order:

| Slice | Scope |
|---|---|
| 1 ✅ | Core shell, routing, theme, project CRUD (this build) |
| 2 | Audio engine — waveform (WaveSurfer.js), spectrogram, frequency analyzer |
| 3 | First audio visualizers (Waveform, Spectrum Bars, Circular Spectrum, Particle) with the full control set (color, glow, sensitivity, etc.) — pattern for the remaining 26 |
| 4 | Lyric Editor — Grok-assisted word/line sync **and** full manual override on the timeline, AI lyric cleanup/subtitle formatting |
| 5 | Timeline/multi-track editor — trim, split, merge, keyframes, undo/redo, snap guides |
| 6 | Export Center — FFmpeg-WASM, MP4/MOV/WebM/GIF, 720p–4K, 24/30/60fps, background export, retry/cancel, progress |
| 7 | Template Store, Asset Library, remaining visualizers/templates, polish pass |

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
├─ public/
│  └─ favicon.svg
├─ src/
│  ├─ components/
│  │  ├─ icons/Icons.tsx        # shared SVG icon set (no emoji anywhere)
│  │  ├─ layout/                # AppShell, Sidebar, Topbar (+ mobile drawer)
│  │  └─ ui/                    # Button, Modal, Card-equivalents, ProjectCard,
│  │                             # StatusBadge, AmbientMeter (signature motif)
│  ├─ context/
│  │  ├─ ThemeContext.tsx       # dark/light, persisted
│  │  └─ ProjectContext.tsx     # full project CRUD + autosave + versioning
│  ├─ hooks/
│  │  └─ useKeyboardShortcuts.ts
│  ├─ lib/
│  │  └─ storage.ts             # defensive localStorage wrapper
│  ├─ pages/                    # Splash, Landing, Dashboard, Projects,
│  │                             # ProjectWorkspace, Settings, Help, About
│  ├─ test/                     # Vitest unit tests + jsdom setup
│  ├─ types/project.ts          # full Project data model (forward-typed for
│  │                             # later slices: audio, templates, timeline)
│  ├─ App.tsx                   # router
│  ├─ main.tsx                  # entry point
│  └─ styles/index.css          # Tailwind layers + design tokens
├─ index.html
├─ package.json
├─ vite.config.ts               # includes Vitest config + COOP/COEP headers
│                                 # (required later for FFmpeg-WASM)
├─ tailwind.config.js           # full color/type/animation token system
├─ tsconfig.json / tsconfig.node.json
├─ netlify.toml
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

## Netlify deployment

This repo is Netlify-ready out of the box via `netlify.toml`:

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. In Netlify: **Add new site → Import an existing project**, pick the repo.
3. Build command and publish directory are already set (`npm run build`,
   `dist`) via `netlify.toml` — Netlify will detect them automatically.
4. Add your environment variables (see below) under **Site settings →
   Environment variables** before the first deploy that uses AI features.
5. Deploy. The SPA redirect rule (`/* → /index.html`) is already configured so
   client-side routing (e.g. `/projects/abc123`) works on refresh and direct link.

The `netlify.toml` also sets `Cross-Origin-Opener-Policy` /
`Cross-Origin-Embedder-Policy` headers site-wide — these are required for
FFmpeg-WASM's `SharedArrayBuffer` usage in the upcoming Export Center slice, so
they're configured now rather than as a surprise later.

## Grok API setup

Slice 1 ships the env scaffolding for Grok but does not yet call it (that
lands in Slice 4, Lyric Editor). To prepare:

1. Get an API key from [console.x.ai](https://console.x.ai).
2. Set `VITE_GROK_API_KEY` in `.env` (local) or in Netlify's environment
   variables (production).
3. `VITE_GROK_API_BASE_URL` and `VITE_GROK_MODEL` have sensible defaults in
   `.env.example` — override only if xAI changes their endpoint or you want a
   different model.

**Important:** any `VITE_*` variable is bundled into the client-side JS and is
publicly visible in the browser. For a production app handling real API spend,
the Grok calls in Slice 4 should be proxied through a small serverless
function (e.g. a Netlify Function) rather than calling the API directly from
the browser with an exposed key — flagging this now so it's a deliberate
choice when we build that slice, not an afterthought.

## Troubleshooting

- **`npm install` fails on a fresh clone** — confirm Node 20+ (`node -v`).
  Older Node versions aren't tested against this dependency set.
- **Blank page after `npm run build` + `npm run preview`** — check the browser
  console; this almost always means an env var referenced with
  `import.meta.env.VITE_*` is missing. Confirm `.env` exists and matches
  `.env.example`'s keys.
- **Netlify deploy succeeds but routes 404 on refresh** — confirm the
  `[[redirects]]` block in `netlify.toml` wasn't stripped; Netlify needs it to
  serve `index.html` for client-side routes.
- **Theme flashes the wrong mode on load** — this is a known tradeoff of
  client-side theme detection without SSR; it self-corrects within one paint
  and doesn't affect functionality.
- **Local projects "disappeared"** — they live in this browser's
  `localStorage` only. Clearing site data, using a different browser, or
  private/incognito mode will not show previously created projects. Use
  Settings → Export all projects to back up before clearing browser data.

## License

Proprietary — all rights reserved by the project owner.
