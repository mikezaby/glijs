import assert from 'node:assert/strict'
import test from 'node:test'

import {
  loadStoredAudioSourceMode,
  saveStoredAudioSourceMode,
} from '../src/mediaStorage.ts'

class TestLocalStorage {
  #items = new Map<string, string>()

  getItem(key: string) {
    return this.#items.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.#items.set(key, value)
  }

  removeItem(key: string) {
    this.#items.delete(key)
  }
}

test('stores the selected audio source mode', () => {
  globalThis.localStorage = new TestLocalStorage() as Storage

  saveStoredAudioSourceMode('input')
  assert.equal(loadStoredAudioSourceMode(), 'input')

  saveStoredAudioSourceMode('wav')
  assert.equal(loadStoredAudioSourceMode(), 'wav')
})
