import assert from 'node:assert/strict'
import test from 'node:test'

import { getVisualMediaKind, isVisualVideoDrawable } from '../src/visualMedia.ts'

test('detects image and video files as visual media', () => {
  assert.equal(getVisualMediaKind({ type: 'image/png' }), 'image')
  assert.equal(getVisualMediaKind({ type: 'video/mp4' }), 'video')
})

test('rejects files that are not visual media', () => {
  assert.equal(getVisualMediaKind({ type: 'audio/wav' }), null)
  assert.equal(getVisualMediaKind({ type: '' }), null)
})

test('requires a decoded video frame before video is drawable', () => {
  assert.equal(
    isVisualVideoDrawable({
      readyState: 1,
      videoWidth: 1920,
      videoHeight: 1080,
    }),
    false,
  )
  assert.equal(
    isVisualVideoDrawable({
      readyState: 2,
      videoWidth: 1920,
      videoHeight: 1080,
    }),
    true,
  )
})
