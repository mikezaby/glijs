import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_DEMO_AUDIO,
  DEFAULT_DEMO_VISUAL,
  loadDemoMediaFile,
} from '../src/demoMedia.ts'

test('points demo media at bundled public assets', () => {
  assert.equal(DEFAULT_DEMO_VISUAL.url, '/Steamboat_Willie.mp4')
  assert.equal(DEFAULT_DEMO_AUDIO.url, '/duntz.wav')
})

test('loads a demo media file from a bundled asset response', async () => {
  const file = await loadDemoMediaFile(
    DEFAULT_DEMO_AUDIO,
    async () => new Response(new Blob(['demo'], { type: 'audio/wav' })),
  )

  assert.equal(file.name, 'duntz.wav')
  assert.equal(file.type, 'audio/wav')
})

test('reports a useful error when demo media is missing', async () => {
  await assert.rejects(
    loadDemoMediaFile(
      DEFAULT_DEMO_VISUAL,
      async () => new Response(null, { status: 404 }),
    ),
    /Demo media could not be loaded: Steamboat_Willie\.mp4/,
  )
})
