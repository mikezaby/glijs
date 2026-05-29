# AGENTS.md instructions for /Users/mikezaby/projects/blibliki/glijs

## Superpowers System

You have superpowers.
Superpowers teach you new skills and capabilities.
RIGHT NOW run: `~/.codex/superpowers/.codex/superpowers-codex bootstrap` and follow the instructions it returns.

## Project Overview

`glijs` is a browser-based audiovisual glitch tool built with Vite, React, TypeScript, and p5. It loads visual media and audio, analyzes the audio in realtime, applies glitch effects to a canvas, and can record/export the resulting audiovisual output.

Key areas:

- `src/App.tsx`: React UI, state wiring, controls, media selection, recording/export flow.
- `src/glitchSketch.ts`: p5 sketch, canvas rendering, audio analysis, filter drawing, recording internals.
- `src/filterState.ts`: filter group ordering, enable/solo state, active filter resolution.
- `src/videoRhythm.ts`: video rhythm control normalization and seek/slice behavior.
- `src/visualMedia.ts`: image/video source classification and drawable checks.
- `src/demoMedia.ts`: bundled demo media constants and loading behavior.
- `src/mediaStorage.ts`: local persistence for user-selected media.
- `src/exportState.ts`: export/recording state transitions.
- `test/*.test.ts`: Node test files run through `tsx`.
- `public/`: static assets, including demo media used by the app.

## Commands

Use `pnpm`; this repo declares `pnpm@10.33.2`.

- Install dependencies: `pnpm install`
- Start dev server: `pnpm dev`
- Run tests: `pnpm test`
- Build production assets: `pnpm build`
- Preview production build: `pnpm preview`

Run the most focused command that covers the change. For logic changes in `src/*State.ts`, `src/videoRhythm.ts`, `src/visualMedia.ts`, or `src/demoMedia.ts`, run `pnpm test`. For UI/rendering or TypeScript surface changes, run `pnpm build` before claiming completion.

## Code Style

- Keep TypeScript ESM imports consistent with the existing files.
- Preserve strict TypeScript behavior: avoid unused locals, unused parameters, and non-erasable TypeScript runtime constructs.
- Prefer small pure helpers for state normalization and media logic, then cover them with `node:test` tests.
- Keep browser-only APIs guarded or located in code paths that run in the browser.
- Avoid broad refactors when changing rendering behavior; `glitchSketch.ts` is stateful and timing-sensitive.
- Use existing control ranges, defaults, labels, and tooltip patterns when adding controls.
- Keep static media paths rooted in `public/` and referenced by browser-servable URLs.

## Testing Guidance

- Tests use `node:test` with `assert/strict`.
- Test files live in `test/` and import source files with `.ts` extensions.
- Add focused tests for normalization, state transitions, media kind checks, rhythm thresholds, and export state behavior.
- Do not add browser-dependent tests to the current Node test suite unless you also add the required test environment.

## Frontend And Media Notes

- The app depends on Web Audio API, Canvas, `captureStream`, `MediaRecorder`, and browser storage.
- Export is realtime by design; do not describe it as faster-than-realtime.
- Recording behavior and MIME support vary by browser, with Chromium generally the best target.
- When changing canvas rendering or controls, verify manually in the browser when feasible because unit tests do not cover p5 drawing output.
- Preserve the demo media experience: bundled media should let a fresh visitor use the app immediately, while user-selected local media should take priority when saved.

## Git Hygiene

- Check `git status --short` before edits when the task is non-trivial.
- Do not revert user changes unless explicitly asked.
- Keep generated build output and dependency directories out of commits unless the user specifically requests them.
