# glijs

[Live demo](https://glijs.netlify.app/)

glijs is a browser-based audiovisual glitch tool. It combines image or silent video input with an audio track, then uses realtime controls and audio analysis to produce rhythm-driven visual distortion.

The project is built with Vite, TypeScript, and p5.

## What It Does

- Loads an image or video as the visual source.
- Loads a separate audio file for playback and analysis.
- Starts video playback together with the audio.
- Applies realtime visual groups such as RGB split, tears, squares, scanlines, streaks, and video rhythm effects.
- Lets each control group be enabled, disabled, or soloed for isolated testing.
- Supports video rhythm modes, including multi-seek slices driven by bass, highs, and overall audio sensitivity.
- Supports strip and cube slice shapes, slice count, motion amount, seek range, and merge timing.
- Provides control tooltips so users can understand what each fader or option changes.
- Can record the output and render/download a full track without needing to watch and manually stop the recording.

## Demo Media

The app includes default demo media so visitors can try it immediately:

- `public/Steamboat_Willie.mp4` as the default video source.
- `public/duntz.wav` as the default audio source.

If the user selects their own files, those selections are saved locally in the browser and take priority over the demo files on the next visit.

## Local Development

Install dependencies:

```sh
pnpm install
```

Start the development server:

```sh
pnpm dev
```

Run tests:

```sh
pnpm test
```

Build the static site:

```sh
pnpm build
```

Preview the production build:

```sh
pnpm preview
```

## Deployment

The app builds to `dist/` and can be deployed as a static site. The current deployed version is:

https://glijs.netlify.app/

For Netlify or similar static hosts, use:

- Build command: `pnpm build`
- Publish directory: `dist`

## Export Notes

The offline render/download feature records the canvas and audio through browser media APIs. It does not render faster than realtime; a three-minute audio track takes about three minutes to export.

Export format and quality depend on the browser's `MediaRecorder` support. Modern Chromium-based browsers usually provide the best compatibility.

## Browser Requirements

glijs expects a modern browser with support for:

- Web Audio API
- Canvas rendering and `captureStream`
- MediaRecorder
- IndexedDB/localStorage for saved media choices

