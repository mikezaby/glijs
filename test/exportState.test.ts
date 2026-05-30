import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canRecordVideo,
  canRenderVideo,
  getRenderButtonLabel,
} from '../src/exportState.ts'

test('allows unattended render only when media is loaded and no export is active', () => {
  assert.equal(
    canRenderVideo({
      hasAudio: true,
      hasVisualMedia: true,
      recording: false,
      rendering: false,
      audioSourceMode: 'wav',
    }),
    true,
  )
  assert.equal(
    canRenderVideo({
      hasAudio: true,
      hasVisualMedia: true,
      recording: true,
      rendering: false,
      audioSourceMode: 'wav',
    }),
    false,
  )
  assert.equal(
    canRenderVideo({
      hasAudio: true,
      hasVisualMedia: true,
      recording: false,
      rendering: false,
      audioSourceMode: 'input',
    }),
    false,
  )
})

test('blocks manual recording while unattended render is active', () => {
  assert.equal(
    canRecordVideo({
      hasAudio: true,
      hasVisualMedia: true,
      recording: true,
      rendering: true,
      audioSourceMode: 'input',
    }),
    false,
  )
})

test('labels render button by render state', () => {
  assert.equal(getRenderButtonLabel({ rendering: false }), 'Render & download')
  assert.equal(getRenderButtonLabel({ rendering: true }), 'Rendering...')
})
