# Tailwind + @blibliki/ui Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace hand-rolled CSS with @blibliki/ui components and Tailwind utilities, mirroring the grid app's technical setup and slate dark aesthetic.

**Architecture:** App.tsx becomes fully props-driven (all sketch-driving state flows down from main.tsx). main.tsx manages state as plain JS variables and re-renders App via `flushSync(() => appRoot.render(<App {...} />))` on changes. Settings panel open/close and active tab remain as React local `useState` in App.tsx.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), `@blibliki/ui` (local file), `@blibliki/utils` (local file, transitive dep of @blibliki/ui).

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

**Step 1: Add deps**

```bash
cd /Users/mikezaby/projects/blibliki/glijs/.worktrees/tailwind-blibliki-ui
pnpm add "@blibliki/ui@file:../../../blibliki/packages/ui" "@blibliki/utils@file:../../../blibliki/packages/utils" tailwindcss @tailwindcss/vite clsx tailwind-merge
```

**Step 2: Verify install**

```bash
pnpm tsc --noEmit 2>&1 | head -20
```
Expected: no errors about missing modules (other TS errors are fine at this stage).

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: add tailwindcss and @blibliki/ui deps"
```

---

## Task 2: Configure Vite + create CSS structure

**Files:**
- Modify: `vite.config.ts`
- Create: `src/styles/tailwind.css`
- Create: `src/styles/index.css`
- Create: `src/styles/app.css`

**Step 1: Update vite.config.ts**

```ts
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/glijs/' : '/',
  plugins: [tailwindcss(), react()],
})
```

**Step 2: Create src/styles/tailwind.css**

Bridges `@blibliki/ui` token vars into Tailwind utility classes. Mirrors grid's `src/styles/tailwind.css`.

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --radius-sm: var(--ui-radius-sm);
  --radius-md: var(--ui-radius-md);
  --radius-lg: var(--ui-radius-lg);

  --color-surface-canvas: var(--ui-color-surface-0);
  --color-surface-panel: var(--ui-color-surface-1);
  --color-surface-raised: var(--ui-color-surface-raised);
  --color-surface-subtle: var(--ui-color-surface-2);

  --color-content-primary: var(--ui-color-text-primary);
  --color-content-secondary: var(--ui-color-text-secondary);
  --color-content-muted: var(--ui-color-text-muted);

  --color-border-subtle: var(--ui-color-border-subtle);
  --color-border-strong: color-mix(
    in oklab,
    var(--ui-color-border-subtle),
    var(--ui-color-text-primary) 18%
  );

  --color-brand: var(--ui-color-primary-500);
  --color-brand-hover: var(--ui-color-primary-600);
  --color-brand-contrast: var(--ui-color-primary-contrast);
}
```

**Step 3: Create src/styles/app.css**

Only glijs-specific layout that Tailwind can't cover: canvas stage, bottom-drawer slide animation, and filter state classes.

```css
:root {
  --settings-height: min(340px, 48vh);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  min-height: 100vh;
}

button,
input,
select {
  font: inherit;
}

#app {
  min-height: 100vh;
}

.sketch-host {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #030303;
}

.sketch-host canvas {
  display: block;
  width: 100%;
  height: 100%;
}

/* Bottom drawer slide animation */
.settings-panel {
  position: fixed;
  z-index: 40;
  right: 0;
  bottom: 0;
  left: 0;
  height: var(--settings-height);
  max-height: var(--settings-height);
  transform: translateY(100%);
  transition: transform 180ms ease;
}

.settings-panel.is-open {
  transform: translateY(0);
}

/* Toggle grip rides above the panel */
.settings-toggle {
  position: fixed;
  z-index: 50;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  transition: bottom 180ms ease;
}

.settings-toggle.is-open {
  bottom: calc(var(--settings-height) - 1px);
}

/* Tab panel visibility */
.settings-tab-panel[hidden] {
  display: none;
}

/* Filter/backdrop tab state classes applied by React */
.settings-tab.is-disabled:not(.is-active),
.settings-tab.is-muted-by-solo:not(.is-active) {
  opacity: 0.45;
}

.settings-tab.is-solo {
  color: var(--ui-color-primary-500);
}

.control-group.is-disabled:not(.is-solo),
.control-group.is-muted-by-solo {
  opacity: 0.56;
}

.control-group.is-solo {
  border-color: color-mix(in srgb, var(--ui-color-primary-500) 60%, var(--ui-color-border-subtle));
}

/* Slider row: auto-fit grid */
.slider-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  align-items: end;
}

/* Media row */
.media-row {
  display: grid;
  grid-template-columns:
    minmax(180px, 1.2fr)
    minmax(150px, 0.8fr)
    minmax(180px, 1.2fr)
    minmax(180px, 1fr)
    minmax(440px, 2fr);
  align-items: stretch;
  gap: 12px;
}

/* Filter order grid */
.filter-order-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(180px, 1fr));
  gap: 8px;
}

/* Progress bar fill (gradient, hard to do inline) */
.progress-fill {
  width: 0;
  height: 100%;
  background: linear-gradient(90deg, var(--ui-color-info-500), var(--ui-color-error-500), var(--ui-color-primary-500));
}

/* Info tooltip */
.info-tooltip {
  display: inline-flex;
  position: relative;
  justify-content: center;
  align-items: center;
  width: 16px;
  height: 16px;
  border: 1px solid var(--ui-color-border-subtle);
  border-radius: 50%;
  color: var(--ui-color-text-muted);
  font-size: 0.68rem;
  font-weight: 800;
  line-height: 1;
  text-transform: none;
  letter-spacing: 0;
  cursor: help;
}

.info-tooltip::after {
  content: attr(data-tooltip);
  position: absolute;
  z-index: 4;
  bottom: calc(100% + 8px);
  left: 0;
  display: none;
  width: min(260px, 70vw);
  border: 1px solid var(--ui-color-border-subtle);
  border-radius: var(--ui-radius-md);
  padding: 8px 10px;
  background: var(--ui-color-surface-1);
  color: var(--ui-color-text-primary);
  font-size: 0.76rem;
  font-weight: 600;
  line-height: 1.35;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.32);
}

.info-tooltip:hover::after,
.info-tooltip:focus-visible::after {
  display: block;
}

/* Input source field visibility */
.input-source-field {
  display: none;
  gap: 8px;
}

.input-source-field.is-visible {
  display: grid;
}

@media (max-width: 860px) {
  :root {
    --settings-height: min(440px, 66vh);
  }

  .media-row {
    grid-template-columns: repeat(2, minmax(220px, 1fr));
  }

  .filter-order-grid {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }
}

@media (max-width: 560px) {
  :root {
    --settings-height: min(500px, 72vh);
  }

  .media-row,
  .filter-order-grid {
    grid-template-columns: 1fr;
  }
}
```

**Step 4: Create src/styles/index.css**

```css
@import "./tailwind.css";
@import "@blibliki/ui/styles.css";
@import "./app.css";
```

**Step 5: Run tests**

```bash
pnpm test
```
Expected: 35 passing.

**Step 6: Commit**

```bash
git add vite.config.ts src/styles/
git commit -m "feat: add tailwindcss vite plugin and CSS structure"
```

---

## Task 3: Create theme file + apply UIProvider

**Files:**
- Create: `src/theme/uiTheme.ts`
- Modify: `src/main.tsx`

**Step 1: Create src/theme/uiTheme.ts**

Slate dark theme, identical to grid's default:

```ts
import { createTheme } from '@blibliki/ui'

export const glijsUITheme = createTheme({
  light: {
    surface0: 'var(--color-slate-100)',
    surface1: 'var(--color-slate-50)',
    surfaceRaised: 'var(--color-white)',
    surfaceRaisedHover: 'var(--color-slate-100)',
    surface2: 'var(--color-slate-200)',
    borderSubtle: 'var(--color-slate-300)',
    textPrimary: 'var(--color-slate-900)',
    textSecondary: 'var(--color-slate-700)',
    textMuted: 'var(--color-slate-500)',
    primary500: 'var(--color-blue-500)',
    primary600: 'var(--color-blue-600)',
    primaryContrast: 'var(--color-white)',
    secondary500: 'var(--color-purple-500)',
    secondary600: 'var(--color-purple-600)',
    secondaryContrast: 'var(--color-white)',
    error500: 'var(--color-red-500)',
    error600: 'var(--color-red-600)',
    errorContrast: 'var(--color-white)',
    warning500: 'var(--color-amber-500)',
    warning600: 'var(--color-amber-600)',
    warningContrast: 'var(--color-slate-950)',
    info500: 'var(--color-sky-500)',
    info600: 'var(--color-sky-600)',
    infoContrast: 'var(--color-white)',
    success500: 'var(--color-green-500)',
    success600: 'var(--color-green-600)',
    successContrast: 'var(--color-white)',
  },
  dark: {
    surface0: 'var(--color-slate-950)',
    surface1: 'var(--color-slate-900)',
    surfaceRaised: 'var(--color-slate-800)',
    surfaceRaisedHover: 'var(--color-slate-700)',
    surface2: 'var(--color-slate-700)',
    borderSubtle: 'var(--color-slate-600)',
    textPrimary: 'var(--color-slate-100)',
    textSecondary: 'var(--color-slate-300)',
    textMuted: 'var(--color-slate-400)',
    primary500: 'var(--color-blue-400)',
    primary600: 'var(--color-blue-500)',
    primaryContrast: 'var(--color-white)',
    secondary500: 'var(--color-purple-400)',
    secondary600: 'var(--color-purple-500)',
    secondaryContrast: 'var(--color-white)',
    error500: 'var(--color-red-400)',
    error600: 'var(--color-red-500)',
    errorContrast: 'var(--color-white)',
    warning500: 'var(--color-amber-400)',
    warning600: 'var(--color-amber-500)',
    warningContrast: 'var(--color-slate-950)',
    info500: 'var(--color-sky-400)',
    info600: 'var(--color-sky-500)',
    infoContrast: 'var(--color-white)',
    success500: 'var(--color-green-400)',
    success600: 'var(--color-green-500)',
    successContrast: 'var(--color-white)',
  },
  radius: {
    sm: '6px',
    md: '10px',
    lg: '14px',
  },
})
```

**Step 2: In src/main.tsx, replace CSS import and add UIProvider**

Replace:
```ts
import './style.css'
```
With:
```ts
import './styles/index.css'
```

Add imports:
```ts
import { UIProvider, themeToCssVariables } from '@blibliki/ui'
import { glijsUITheme } from './theme/uiTheme'
```

Add after imports (before any other code):
```ts
document.documentElement.classList.add('dark')
const cssVars = themeToCssVariables(glijsUITheme, 'dark')
for (const [name, value] of Object.entries(cssVars)) {
  document.documentElement.style.setProperty(name, value)
}
```

Wrap the `appRoot.render(...)` call:
```ts
flushSync(() => {
  appRoot.render(
    <UIProvider mode="dark" theme={glijsUITheme}>
      <App />
    </UIProvider>
  )
})
```

**Step 3: Run tests**

```bash
pnpm test
```
Expected: 35 passing.

**Step 4: Commit**

```bash
git add src/theme/ src/main.tsx
git commit -m "feat: add @blibliki/ui theme and UIProvider"
```

---

## Task 4: Add AppProps interface to App.tsx (plumbing only, no visual change)

**Files:**
- Modify: `src/App.tsx`

Add the full props interface and thread props through all sub-components. Keep all existing HTML structure and CSS class names unchanged — this task is plumbing only.

**Step 1: Add new imports to App.tsx**

```ts
import type { AudioSourceMode } from './audioSource'
import { isWavFileInputVisible } from './audioSource'
import type { FilterGroupKey, FilterGroupState } from './glitchSketch'
import { DEFAULT_FILTER_GROUP_STATE } from './glitchSketch'
import type { VideoRhythmMode, VideoRhythmShape } from './videoRhythm'
```

**Step 2: Add exported types (after existing type exports)**

```ts
export type AudioDeviceOption = { id: string; label: string }

export type SketchUISnapshot = {
  playing: boolean
  recording: boolean
  rendering: boolean
  hasAudio: boolean
  hasVisualMedia: boolean
  currentTime: string
  duration: string
  progressPercent: number
}

export interface AppProps {
  blockControls?: BlockControls
  filterGroupState?: FilterGroupState
  filterOrder?: FilterGroupKey[]
  videoRhythmControls?: VideoRhythmControls
  audioSourceMode?: AudioSourceMode
  audioDevices?: AudioDeviceOption[]
  imageFileName?: string
  audioFileName?: string
  audioInputName?: string
  lastBackdropIntensity?: number
  snapshot?: SketchUISnapshot
  status?: string
  onControlChange?: (key: ControlKey, value: number) => void
  onFilterGroupStateChange?: (key: FilterGroupKey, enabled: boolean, solo: boolean) => void
  onFilterOrderChange?: (order: FilterGroupKey[]) => void
  onVideoRhythmChange?: (controls: VideoRhythmControls) => void
  onAudioSourceChange?: (mode: AudioSourceMode) => void
  onAudioInputConnectClick?: () => void
  onImageFileChange?: (file: File) => void
  onAudioFileChange?: (file: File) => void
  onPlayClick?: () => void
  onRecordClick?: () => void
  onRenderClick?: () => void
}
```

**Step 3: Update App component signature**

```tsx
export const App = ({
  blockControls = DEFAULT_BLOCK_CONTROLS,
  filterGroupState = DEFAULT_FILTER_GROUP_STATE,
  filterOrder = DEFAULT_FILTER_ORDER,
  videoRhythmControls = DEFAULT_VIDEO_RHYTHM_CONTROLS,
  audioSourceMode = 'wav',
  audioDevices = [],
  imageFileName,
  audioFileName,
  audioInputName,
  lastBackdropIntensity = DEFAULT_BLOCK_CONTROLS.backdropIntensity,
  snapshot,
  status,
  onControlChange,
  onFilterGroupStateChange,
  onFilterOrderChange,
  onVideoRhythmChange,
  onAudioSourceChange,
  onAudioInputConnectClick,
  onImageFileChange,
  onAudioFileChange,
  onPlayClick,
  onRecordClick,
  onRenderClick,
}: AppProps) => (
```

**Step 4: Pass props to sub-components**

Update `ControlGroupSection` to accept and use `blockControls`, `filterGroupState`, `onControlChange`, `onFilterGroupStateChange`. Update `VideoRhythmControls` to accept `videoRhythmControls`, `onVideoRhythmChange`. Update `MediaControls` to accept media state props.

Keep all `defaultValue` / `defaultChecked` references replaced with the actual prop values.

**Step 5: Run tests**

```bash
pnpm test
```
Expected: 35 passing.

**Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add AppProps interface to App.tsx"
```

---

## Task 5: Wire main.tsx to re-render App with state props

**Files:**
- Modify: `src/main.tsx`

Replace all imperative DOM queries for controls with a re-render approach.

**Step 1: Import AppProps and add state object**

Add import:
```ts
import type { AppProps, AudioDeviceOption, SketchUISnapshot } from './App'
```

After the `appRoot` declaration, add:
```ts
let appProps: AppProps = {}
let currentAudioDevices: AudioDeviceOption[] = []

const rerenderApp = () => {
  flushSync(() => {
    appRoot.render(
      <UIProvider mode="dark" theme={glijsUITheme}>
        <App {...appProps} />
      </UIProvider>
    )
  })
}
```

**Step 2: Extract computeStatus() helper**

Extract the status-text logic from `syncUi()` into a pure function:
```ts
const computeStatus = (snapshot: ReturnType<typeof sketch.getSnapshot>): string => {
  if (snapshot.rendering) return 'Rendering video for download...'
  if (snapshot.recording) return 'Recording video...'
  if (statusOverride && Date.now() < statusOverride.expiresAt) return statusOverride.text
  statusOverride = null
  if (!snapshot.hasVisualMedia && !snapshot.hasAudio) return 'Load image or video and WAV or audio input.'
  if (!snapshot.hasVisualMedia) return 'Image or video missing.'
  if (!snapshot.hasAudio) return getAudioMissingStatus(snapshot.audioSourceMode)
  return snapshot.playing ? 'Playing.' : 'Ready.'
}
```

**Step 3: Replace syncUi() with version that updates appProps and calls rerenderApp()**

```ts
const syncUi = () => {
  const snapshot = sketch.getSnapshot()
  const progressRatio = snapshot.duration > 0 ? snapshot.currentTime / snapshot.duration : 0

  const uiSnapshot: SketchUISnapshot = {
    playing: snapshot.playing,
    recording: snapshot.recording,
    rendering: snapshot.rendering,
    hasAudio: snapshot.hasAudio,
    hasVisualMedia: snapshot.hasVisualMedia,
    currentTime: formatTime(snapshot.currentTime),
    duration: formatTime(snapshot.duration),
    progressPercent: Math.min(100, Math.max(0, progressRatio * 100)),
  }

  appProps = {
    ...appProps,
    blockControls,
    filterGroupState,
    filterOrder,
    videoRhythmControls,
    audioDevices: currentAudioDevices,
    lastBackdropIntensity,
    snapshot: uiSnapshot,
    status: computeStatus(snapshot),
  }
  rerenderApp()
}
```

**Step 4: Wire all callbacks into appProps**

Set these once after `appProps` declaration:

```ts
appProps.onControlChange = (key, value) => {
  blockControls = { ...blockControls, [key]: value }
  if (key === 'backdropIntensity' && value > 0) lastBackdropIntensity = value
  sketch.setBlockControls(blockControls)
  saveStoredBlockControls(blockControls)
}

appProps.onFilterGroupStateChange = (key, enabled, solo) => {
  applyFilterGroupState({
    ...filterGroupState,
    [key]: { enabled, solo },
  })
}

appProps.onFilterOrderChange = applyFilterOrder

appProps.onVideoRhythmChange = applyVideoRhythmControls

appProps.onAudioSourceChange = async (mode) => {
  try {
    sketch.setAudioSourceMode(mode)
    saveStoredAudioSourceMode(mode)
    if (mode === 'input') {
      await refreshAudioInputDevices()
    }
    appProps = { ...appProps, audioSourceMode: mode }
    syncUi()
  } catch (error) {
    appProps = { ...appProps, status: error instanceof Error ? error.message : 'Audio source change failed.' }
    rerenderApp()
  }
}

appProps.onAudioInputConnectClick = async () => {
  // existing audioInputConnect.addEventListener('click', ...) logic
  // uses audioInputDeviceId from local state — keep a module-level var for this
}

appProps.onImageFileChange = async (file) => {
  appProps = { ...appProps, status: 'Loading image...' }
  rerenderApp()
  try {
    await sketch.loadVisualMedia(file)
    await saveStoredMedia('image', file)
    appProps = { ...appProps, imageFileName: file.name }
    syncUi()
  } catch (error) {
    appProps = { ...appProps, status: error instanceof Error ? error.message : 'Visual media loading failed.' }
    rerenderApp()
  }
}

appProps.onAudioFileChange = async (file) => {
  appProps = { ...appProps, status: 'Loading WAV...' }
  rerenderApp()
  try {
    await sketch.loadAudio(file)
    await saveStoredMedia('audio', file)
    appProps = { ...appProps, audioFileName: file.name, audioSourceMode: 'wav' }
    syncUi()
  } catch (error) {
    appProps = { ...appProps, status: error instanceof Error ? error.message : 'Audio loading failed.' }
    rerenderApp()
  }
}

appProps.onPlayClick = async () => {
  try {
    await sketch.togglePlayback()
    syncUi()
  } catch (error) {
    appProps = { ...appProps, status: error instanceof Error ? error.message : 'Playback failed.' }
    rerenderApp()
  }
}

appProps.onRecordClick = async () => {
  try {
    if (sketch.getSnapshot().recording) {
      setStatusOverride('Preparing video download...', 5000)
      await sketch.stopVideoRecording()
    } else {
      setStatusOverride('Recording video...', 5000)
      await sketch.startVideoRecording()
    }
    syncUi()
  } catch (error) {
    setStatusOverride(error instanceof Error ? error.message : 'Video recording failed.', 4500)
  }
}

appProps.onRenderClick = async () => {
  try {
    setStatusOverride('Rendering video for download...', 5000)
    await sketch.renderVideoRecording()
    syncUi()
  } catch (error) {
    setStatusOverride(error instanceof Error ? error.message : 'Video render failed.', 4500)
  }
}
```

**Step 5: Update refreshAudioInputDevices() to update currentAudioDevices**

```ts
const refreshAudioInputDevices = async () => {
  if (!navigator.mediaDevices?.enumerateDevices) {
    currentAudioDevices = []
    return
  }
  const devices = await navigator.mediaDevices.enumerateDevices()
  currentAudioDevices = devices
    .filter((d) => d.kind === 'audioinput')
    .map((d, i) => ({ id: d.deviceId, label: d.label || `Audio input ${i + 1}` }))
  appProps = { ...appProps, audioDevices: currentAudioDevices }
  rerenderApp()
}
```

**Step 6: Remove all DOM query variables and their event listeners for controls**

Delete: `controlSliders`, `controlValues`, `videoRhythmSliders`, `videoRhythmValues`, `filterEnabledInputs`, `filterSoloInputs`, `filterGroupSections`, `filterTabButtons`, `audioSource`, `audioDevice`, `audioInput`, `imageInput`, `audioInputConnect`, `audioInputControls`, `audioInputName`, `audioName`, `imageName`, `playButton`, `recordButton`, `renderButton`, `status`, `currentTime`, `duration`, `progress`, `settingsTabs`, `settingsTabPanels`, `settingsPanel`, `settingsToggle`, `settingsClose`, `backdropEnabledInput`, `backdropTabButton`, and all their `addEventListener` calls.

Keep: `sketchHost`, `filterOrderList`, `filterOrderRoot` (filter order still uses its own root).

**Step 7: Run tests**

```bash
pnpm test
```
Expected: 35 passing.

**Step 8: Commit**

```bash
git add src/main.tsx
git commit -m "feat: wire main.tsx to re-render App with state props"
```

---

## Task 6: Rebuild App.tsx layout with Tailwind

**Files:**
- Modify: `src/App.tsx`

Replace all CSS class names with Tailwind utility classes. Keep the same HTML structure, `data-*` attributes, and `role`/`aria-*` attributes unchanged. Keep native form elements (Fader/Switch come in Tasks 7–9).

### Shell / stage

```tsx
<main className="relative min-h-screen overflow-hidden">
  <section className="min-h-screen p-0" />
```

### Settings toggle

```tsx
<button
  className={`settings-toggle w-[86px] h-[34px] grid place-items-center border border-border-subtle border-b-0 rounded-t-lg px-0 bg-surface-panel/[0.94] text-content-primary cursor-pointer backdrop-blur-[14px] shadow-[0_-10px_36px_rgba(0,0,0,0.38)] ${open ? 'is-open' : ''}`}
>
  <span className="block w-[42px] h-[3px] rounded-full bg-content-muted relative before:absolute before:content-[''] before:w-full before:h-full before:rounded-full before:bg-content-muted/[0.62] before:-top-[6px] after:absolute after:content-[''] after:w-full after:h-full after:rounded-full after:bg-content-muted/[0.62] after:top-[6px]" aria-hidden />
</button>
```

### Settings panel

```tsx
<aside
  className={`settings-panel grid grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden border-t border-border-subtle bg-surface-canvas/[0.88] backdrop-blur-[18px] shadow-[0_-24px_80px_rgba(0,0,0,0.42)] ${open ? 'is-open' : ''}`}
>
```

### Settings header

```tsx
<div className="grid grid-cols-[minmax(180px,auto)_minmax(120px,1fr)_auto] gap-3 items-center min-h-[48px] px-3.5 py-2 border-b border-border-subtle">
  <div className="flex gap-3 items-baseline min-w-0">
    <span className="text-content-primary text-[0.82rem] uppercase tracking-[0.08em]">Settings</span>
    <p className="min-w-0 overflow-hidden text-content-muted text-[0.78rem] text-ellipsis whitespace-nowrap m-0 min-h-[1.4em]" data-status>
      {status ?? 'Load image or video and WAV.'}
    </p>
  </div>
  <div className="overflow-hidden h-1.5 min-w-[120px] rounded-full bg-surface-subtle">
    <div className="progress-fill" data-progress style={{ width: `${snapshot?.progressPercent ?? 0}%` }} />
  </div>
  <button data-settings-close className="border border-border-subtle rounded-md px-2.5 py-[7px] bg-surface-panel text-content-muted cursor-pointer">
    Close
  </button>
</div>
```

### Settings tabs

```tsx
<div className="flex gap-1 overflow-x-auto px-3.5 pt-2 pb-0 border-b border-border-subtle [scrollbar-width:thin]" role="tablist">
```

### Each settings tab

```tsx
<button
  className={`settings-tab flex-none border border-transparent border-b-0 rounded-t-[7px] px-[13px] py-2 bg-transparent text-content-muted text-[0.76rem] font-extrabold uppercase tracking-[0.04em] cursor-pointer hover:text-content-primary hover:bg-white/[0.06] aria-selected:border-border-subtle aria-selected:bg-surface-panel aria-selected:text-brand ${...stateClasses}`}
```

### Control group section

```tsx
<section className={`control-group settings-tab-panel grid gap-3 content-start p-4`} ...>
```

### Control group head

```tsx
<div className="flex gap-2.5 items-center">
  <h2 className="flex flex-1 gap-2 items-center m-0 text-content-primary text-[0.78rem] font-bold uppercase before:w-[3px] before:h-[1.1em] before:rounded-full before:bg-brand before:content-[''] after:flex-1 after:h-px after:bg-border-subtle after:content-['']">
    {group.name}
  </h2>
```

### Toggle fields (keep native checkbox for now, just restyle)

```tsx
<label className="inline-flex gap-1.5 items-center text-content-muted text-[0.72rem] font-bold uppercase cursor-pointer">
  <input type="checkbox" className="w-3.5 h-3.5 m-0 accent-brand" ... />
  Enable
</label>
```

### Slider field (keep native range for now)

```tsx
<label className="grid gap-1.5 min-w-0 py-0.5" title={control.title}>
  <div className="flex justify-between gap-3 items-center">
    <span className="inline-flex relative gap-1.5 items-center w-fit text-content-primary text-[0.82rem] uppercase tracking-[0.08em]">
      {control.label}
      <InfoTooltip text={control.title} />
    </span>
    <strong className="text-brand tabular-nums">
      {(blockControls ?? DEFAULT_BLOCK_CONTROLS)[control.key]}%
    </strong>
  </div>
  <input type="range" min="0" max="100" ... className="w-full accent-brand" />
</label>
```

### File fields

```tsx
<label className="grid gap-1.5 min-w-0">
  <span className="text-content-primary text-[0.82rem] uppercase tracking-[0.08em]">Image / video</span>
  <input
    type="file"
    accept="image/*,video/*"
    className="w-full border border-border-subtle rounded-md p-2.5 bg-surface-panel text-content-muted file:mr-2.5 file:border-0 file:rounded file:py-[7px] file:px-2.5 file:bg-content-primary file:text-[#070707] file:font-bold file:cursor-pointer"
  />
  <small className="min-w-0 overflow-hidden text-content-muted text-ellipsis whitespace-nowrap">
    {imageFileName ?? 'No visual media'}
  </small>
</label>
```

### Select fields (keep native select for now)

```tsx
<label className="grid gap-1.5 min-w-0">
  <span className="text-content-primary text-[0.82rem] uppercase tracking-[0.08em]">Audio source</span>
  <select className="w-full border border-border-subtle rounded-md p-2.5 bg-surface-panel text-content-primary" ...>
```

### Transport buttons (keep native button for now)

```tsx
<div className="grid grid-cols-[repeat(3,max-content)_minmax(90px,1fr)] gap-2 items-center min-w-[440px]">
  <button className="border-0 rounded-md px-[18px] py-2.5 bg-brand text-[#050505] font-extrabold cursor-pointer disabled:cursor-not-allowed disabled:opacity-[0.42]" ...>
    {snapshot?.playing ? 'Pause' : 'Play'}
  </button>
  <button className="border border-border-subtle rounded-md px-[18px] py-2.5 bg-surface-subtle text-content-primary font-extrabold cursor-pointer disabled:cursor-not-allowed disabled:opacity-[0.42]" ...>
```

### Filter order grid

```tsx
<div className="filter-order-grid">
  <div className="grid grid-cols-[1fr_auto] gap-2.5 items-center p-2.5 rounded-md bg-surface-subtle">
    <span className="min-w-0 text-content-primary text-[0.86rem] font-bold">...</span>
    <div className="inline-flex gap-1.5">
      <button className="border border-border-subtle rounded-[5px] px-2 py-1.5 bg-surface-subtle text-content-muted cursor-pointer disabled:cursor-not-allowed disabled:opacity-[0.35]">Up</button>
```

**Step 1: Apply all the above throughout App.tsx**

**Step 2: Run tests**

```bash
pnpm test
```
Expected: 35 passing.

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: replace CSS class names with Tailwind utilities in App.tsx"
```

---

## Task 7: Replace sliders with Fader

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add Fader import**

```ts
import { Fader } from '@blibliki/ui'
```

**Step 2: Replace slider label+input in ControlGroupSection**

Remove the `<label className="...slider-field">` wrapper and its contents. Replace with:

```tsx
<Fader
  key={control.key}
  name={control.label}
  title={control.title}
  min={0}
  max={100}
  orientation="horizontal"
  value={blockControls[control.key]}
  onChange={(value) => onControlChange?.(control.key, value)}
/>
```

**Step 3: Replace sliders in VideoRhythmSection**

```tsx
<Fader
  key={control.key}
  name={control.label}
  title={control.title}
  min={control.min}
  max={control.max}
  orientation="horizontal"
  value={videoRhythmControls[control.key] as number}
  onChange={(value) =>
    onVideoRhythmChange?.({ ...videoRhythmControls, [control.key]: value })
  }
/>
```

**Step 4: Remove slider-row class from the wrapping div** (Fader handles its own layout; wrap in a simple `flex flex-wrap gap-4` or keep `slider-row` CSS for the outer grid).

**Step 5: Run tests**

```bash
pnpm test
```
Expected: 35 passing (update tests that look for `input[type="range"]` to look for `.ui-fader` or `aria-label`).

**Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: replace range inputs with Fader component"
```

---

## Task 8: Replace checkboxes with Switch

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add Switch import**

```ts
import { Switch } from '@blibliki/ui'
```

**Step 2: Replace Enable/Solo toggles in ControlGroupSection**

```tsx
<label className="inline-flex gap-1.5 items-center text-content-muted text-[0.72rem] font-bold uppercase cursor-pointer">
  <Switch
    size="sm"
    checked={filterGroupState[group.filterKey!]?.enabled ?? true}
    onCheckedChange={(enabled) =>
      onFilterGroupStateChange?.(
        group.filterKey!,
        enabled,
        filterGroupState[group.filterKey!]?.solo ?? false,
      )
    }
  />
  Enable
</label>
<label className="inline-flex gap-1.5 items-center text-brand text-[0.72rem] font-bold uppercase cursor-pointer">
  <Switch
    size="sm"
    color="secondary"
    checked={filterGroupState[group.filterKey!]?.solo ?? false}
    onCheckedChange={(solo) =>
      onFilterGroupStateChange?.(
        group.filterKey!,
        filterGroupState[group.filterKey!]?.enabled ?? true,
        solo,
      )
    }
  />
  Solo
</label>
```

**Step 3: Replace backdrop Enable toggle**

```tsx
<label className="inline-flex gap-1.5 items-center text-content-muted text-[0.72rem] font-bold uppercase cursor-pointer">
  <Switch
    size="sm"
    checked={(blockControls.backdropIntensity ?? 0) > 0}
    onCheckedChange={(checked) =>
      onControlChange?.(
        'backdropIntensity',
        checked ? (lastBackdropIntensity ?? DEFAULT_BLOCK_CONTROLS.backdropIntensity) : 0,
      )
    }
  />
  Enable
</label>
```

**Step 4: Run tests**

```bash
pnpm test
```
Expected: 35 passing (update tests that look for `input[type="checkbox"]`).

**Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: replace checkboxes with Switch component"
```

---

## Task 9: Replace selects with OptionSelect + buttons with Button

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add OptionSelect and Button imports**

```ts
import { Button, OptionSelect } from '@blibliki/ui'
```

**Step 2: Replace audio source select**

```tsx
<OptionSelect
  label="Audio source"
  value={audioSourceMode}
  options={[
    { name: 'WAV file', value: 'wav' },
    { name: 'Audio input', value: 'input' },
  ]}
  onChange={(value) => onAudioSourceChange?.(value as AudioSourceMode)}
/>
```

**Step 3: Replace audio device select**

Keep a local `useState` for selected device ID inside `MediaControls`:
```tsx
const [deviceId, setDeviceId] = useState('')

<OptionSelect
  value={deviceId}
  options={[
    { name: 'Default input', value: '' },
    ...(audioDevices ?? []).map((d) => ({ name: d.label, value: d.id })),
  ]}
  onChange={setDeviceId}
/>
```

Pass `deviceId` to the connect button's click handler via `onAudioInputConnectClick` by wiring it differently: rename the prop to `onAudioInputConnectClick` staying the same but MediaControls captures deviceId from local state and calls a new prop `onAudioDeviceConnect?: (deviceId: string) => void`.

**Step 4: Replace video rhythm mode + shape selects**

```tsx
<OptionSelect
  label="Mode"
  value={videoRhythmControls.mode}
  options={[
    { name: 'Normal playback', value: 'normal' },
    { name: 'Rhythm seek', value: 'seek' },
    { name: 'Multi-seek slices', value: 'multi' },
  ]}
  onChange={(value) => onVideoRhythmChange?.({ ...videoRhythmControls, mode: value as VideoRhythmMode })}
/>

<OptionSelect
  label="Shape"
  value={videoRhythmControls.shape}
  options={[
    { name: 'Strips', value: 'strips' },
    { name: 'Cubes', value: 'cubes' },
  ]}
  onChange={(value) => onVideoRhythmChange?.({ ...videoRhythmControls, shape: value as VideoRhythmShape })}
/>
```

**Step 5: Replace transport buttons**

```tsx
<Button
  variant="contained"
  color="primary"
  disabled={!snapshot?.hasAudio || snapshot?.recording || snapshot?.rendering}
  onClick={onPlayClick}
>
  {snapshot?.playing ? 'Pause' : 'Play'}
</Button>

<Button
  variant="outlined"
  color="neutral"
  disabled={!snapshot?.hasVisualMedia || !snapshot?.hasAudio || snapshot?.rendering}
  onClick={onRecordClick}
>
  {snapshot?.recording ? 'Stop & download' : 'Record video'}
</Button>

<Button
  variant="outlined"
  color="neutral"
  disabled={snapshot?.recording || snapshot?.rendering || !snapshot?.hasVisualMedia || !snapshot?.hasAudio}
  onClick={onRenderClick}
>
  {renderLabel}
</Button>
```

**Step 6: Replace "Use input" + Close buttons**

```tsx
<Button variant="outlined" color="neutral" size="sm" onClick={() => onAudioDeviceConnect?.(deviceId)}>
  Use input
</Button>

<Button variant="outlined" color="neutral" size="sm" onClick={() => setSettingsOpen(false)}>
  Close
</Button>
```

**Step 7: Run tests**

```bash
pnpm test
```
Expected: 35 passing (update tests that check for native select or specific button text classes).

**Step 8: Commit**

```bash
git add src/App.tsx
git commit -m "feat: replace selects with OptionSelect and buttons with Button"
```

---

## Task 10: Move settings open/close + tab state to React useState

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

**Step 1: Add useState to App**

```tsx
import { useState } from 'react'

// Inside App:
const [settingsOpen, setSettingsOpen] = useState(true)
const [activeTab, setActiveTab] = useState(DEFAULT_SETTINGS_TAB)
```

**Step 2: Wire toggle/close buttons to setSettingsOpen**

Replace `data-settings-toggle` handler logic with direct `onClick={() => setSettingsOpen((v) => !v)}` on the toggle button and `onClick={() => setSettingsOpen(false)}` on the Close button.

**Step 3: Wire tab buttons to setActiveTab**

Replace `data-settings-tab` logic with `onClick={() => setActiveTab(tabKey)}` in `SettingsTab`.

**Step 4: Move keyboard navigation into SettingsTab**

Add `onKeyDown` to `SettingsTab` with Arrow/Home/End logic using `setActiveTab`.

**Step 5: Remove from main.tsx**

Delete any remaining references to settings toggle/close DOM queries and tab-switching logic (should already be gone from Task 5, but verify).

**Step 6: Run tests**

```bash
pnpm test
```
Expected: all passing.

**Step 7: Commit**

```bash
git add src/App.tsx src/main.tsx
git commit -m "feat: move settings panel + tab state to React useState"
```

---

## Task 11: Delete style.css, TypeScript check, manual verify

**Files:**
- Delete: `src/style.css`

**Step 1: Delete style.css**

```bash
rm src/style.css
```

**Step 2: TypeScript check**

```bash
pnpm tsc --noEmit
```
Fix any remaining type errors.

**Step 3: Run tests**

```bash
pnpm test
```
Expected: 35 passing.

**Step 4: Run dev server and manually verify**

```bash
pnpm dev
```

Check:
- Dark slate theme applied (not the old acid yellow)
- Settings panel slides up/down correctly
- Tabs switch content, keyboard navigation works
- Faders respond to drag and show values
- Switches toggle Enable/Solo per filter group
- Transport buttons enable/disable correctly based on snapshot state
- OptionSelect works for audio source, video rhythm mode/shape

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete Tailwind + @blibliki/ui redesign"
```
