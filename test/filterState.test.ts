import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_FILTER_GROUP_STATE,
  resolveActiveFilterOrder,
  type FilterGroupState,
} from '../src/filterState.ts'

test('keeps enabled groups in order when no group is soloed', () => {
  const state: FilterGroupState = {
    ...DEFAULT_FILTER_GROUP_STATE,
    tears: { enabled: false, solo: false },
    scanlines: { enabled: false, solo: false },
  }

  assert.deepEqual(
    resolveActiveFilterOrder(
      ['tears', 'rgbSplit', 'scanlines', 'streaks', 'squares'],
      state,
    ),
    ['rgbSplit', 'streaks', 'squares'],
  )
})

test('uses only soloed groups in order for isolated filter testing', () => {
  const state: FilterGroupState = {
    ...DEFAULT_FILTER_GROUP_STATE,
    rgbSplit: { enabled: true, solo: false },
    tears: { enabled: false, solo: true },
    squares: { enabled: true, solo: true },
    scanlines: { enabled: true, solo: false },
  }

  assert.deepEqual(
    resolveActiveFilterOrder(['scanlines', 'tears', 'rgbSplit', 'squares'], state),
    ['tears', 'squares'],
  )
})
