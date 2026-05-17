import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_VIDEO_RHYTHM_CONTROLS,
  getVideoRhythmIdleMergeStep,
  getVideoRhythmPieceOverscan,
  getVideoRhythmSeekSourceCount,
  getVideoRhythmTriggerThreshold,
  getVideoRhythmSeekTime,
  normalizeVideoRhythmControls,
  shouldResumeVideoSlice,
  shouldTriggerVideoRhythmSeek,
} from '../src/videoRhythm.ts'

test('uses cube demo-friendly video rhythm defaults', () => {
  assert.equal(DEFAULT_VIDEO_RHYTHM_CONTROLS.mode, 'multi')
  assert.equal(DEFAULT_VIDEO_RHYTHM_CONTROLS.shape, 'cubes')
  assert.equal(DEFAULT_VIDEO_RHYTHM_CONTROLS.slices, 9)
  assert.equal(DEFAULT_VIDEO_RHYTHM_CONTROLS.seekRange, 23)
})

test('does not trigger video seeks in normal playback mode', () => {
  assert.equal(
    shouldTriggerVideoRhythmSeek({
      controls: { ...DEFAULT_VIDEO_RHYTHM_CONTROLS, mode: 'normal' },
      metrics: { level: 1, bass: 1, treble: 1 },
      previousEnergy: 0,
      lastSeekAt: 0,
      now: 1000,
    }),
    false,
  )
})

test('triggers a rhythm seek when weighted spectral energy crosses sensitivity', () => {
  assert.equal(
    shouldTriggerVideoRhythmSeek({
      controls: {
        ...DEFAULT_VIDEO_RHYTHM_CONTROLS,
        mode: 'seek',
        sensitivity: 70,
        bass: 90,
        treble: 40,
      },
      metrics: { level: 0.72, bass: 0.95, treble: 0.3 },
      previousEnergy: 0.2,
      lastSeekAt: 0,
      now: 1000,
    }),
    true,
  )
})

test('higher sensitivity lowers the seek trigger threshold', () => {
  assert.ok(
    getVideoRhythmTriggerThreshold({
      ...DEFAULT_VIDEO_RHYTHM_CONTROLS,
      sensitivity: 100,
    }) <
      getVideoRhythmTriggerThreshold({
        ...DEFAULT_VIDEO_RHYTHM_CONTROLS,
        sensitivity: 20,
      }),
  )
})

test('sensitivity changes trigger threshold without changing spectral energy weighting', () => {
  const baseControls = {
    ...DEFAULT_VIDEO_RHYTHM_CONTROLS,
    mode: 'seek' as const,
    bass: 0,
    treble: 0,
  }

  assert.equal(
    shouldTriggerVideoRhythmSeek({
      controls: { ...baseControls, sensitivity: 100 },
      metrics: { level: 0.4, bass: 0.4, treble: 0.4 },
      previousEnergy: 0.1,
      lastSeekAt: 0,
      now: 1000,
    }),
    true,
  )
  assert.equal(
    shouldTriggerVideoRhythmSeek({
      controls: { ...baseControls, sensitivity: 20 },
      metrics: { level: 0.4, bass: 0.4, treble: 0.4 },
      previousEnergy: 0.1,
      lastSeekAt: 0,
      now: 1000,
    }),
    false,
  )
})

test('keeps generated seek times inside the video duration', () => {
  assert.equal(
    getVideoRhythmSeekTime({
      audioTime: 12,
      duration: 8,
      seekRange: 100,
      random: () => 0.75,
    }),
    6,
  )
})

test('resumes paused video slices only after a decoded frame exists', () => {
  assert.equal(shouldResumeVideoSlice({ paused: true, readyState: 1 }), false)
  assert.equal(shouldResumeVideoSlice({ paused: true, readyState: 2 }), true)
  assert.equal(shouldResumeVideoSlice({ paused: false, readyState: 2 }), false)
})

test('allows up to 200 video rhythm pieces', () => {
  assert.equal(normalizeVideoRhythmControls({ slices: 200 }).slices, 200)
  assert.equal(normalizeVideoRhythmControls({ slices: 240 }).slices, 200)
})

test('uses only slice videos as multi seek sources', () => {
  assert.equal(
    getVideoRhythmSeekSourceCount({
      ...DEFAULT_VIDEO_RHYTHM_CONTROLS,
      mode: 'multi',
      slices: 6,
    }),
    6,
  )
})

test('overscans moving video pieces enough to cover motion gaps', () => {
  assert.equal(getVideoRhythmPieceOverscan(28), 58)
})

test('normalizes idle merge delay between two and ten seconds', () => {
  assert.equal(normalizeVideoRhythmControls({ mergeDelay: 1 }).mergeDelay, 2)
  assert.equal(normalizeVideoRhythmControls({ mergeDelay: 12 }).mergeDelay, 10)
})

test('advances idle merge one piece per merge delay', () => {
  assert.equal(
    getVideoRhythmIdleMergeStep({
      lastSeekAt: 1_000,
      now: 4_999,
      mergeDelay: 4,
      sourceCount: 8,
    }),
    0,
  )
  assert.equal(
    getVideoRhythmIdleMergeStep({
      lastSeekAt: 1_000,
      now: 9_100,
      mergeDelay: 4,
      sourceCount: 8,
    }),
    2,
  )
  assert.equal(
    getVideoRhythmIdleMergeStep({
      lastSeekAt: 0,
      now: 20_000,
      mergeDelay: 4,
      sourceCount: 8,
    }),
    0,
  )
})
