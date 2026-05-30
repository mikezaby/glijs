import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createAudioInputConstraints,
  getAudioMissingStatus,
  getAudioMonitorGain,
  isWavFileInputVisible,
  normalizeAudioSourceMode,
} from '../src/audioSource.ts'

test('normalizes audio source mode from control values', () => {
  assert.equal(normalizeAudioSourceMode('input'), 'input')
  assert.equal(normalizeAudioSourceMode('wav'), 'wav')
  assert.equal(normalizeAudioSourceMode('unexpected'), 'wav')
  assert.equal(normalizeAudioSourceMode(null), 'wav')
})

test('describes the missing audio source by selected mode', () => {
  assert.equal(getAudioMissingStatus('wav'), 'WAV missing.')
  assert.equal(getAudioMissingStatus('input'), 'Audio input missing.')
})

test('mutes app monitoring for live audio input', () => {
  assert.equal(getAudioMonitorGain('wav'), 1)
  assert.equal(getAudioMonitorGain('input'), 0)
})

test('shows the WAV picker only for WAV source mode', () => {
  assert.equal(isWavFileInputVisible('wav'), true)
  assert.equal(isWavFileInputVisible('input'), false)
})

test('requests raw live audio input without browser cleanup processing', () => {
  assert.deepEqual(createAudioInputConstraints(), {
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  })

  assert.deepEqual(createAudioInputConstraints('bridge-device'), {
    audio: {
      deviceId: { exact: 'bridge-device' },
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  })
})
