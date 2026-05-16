import assert from 'node:assert/strict'
import test from 'node:test'

import { renderInfoTooltip } from '../src/infoTooltip.ts'

test('renders an accessible info tooltip with the provided text', () => {
  const tooltip = renderInfoTooltip(
    'Controls how easily the audio triggers video seek jumps.',
  )

  assert.match(tooltip, /class="info-tooltip"/)
  assert.match(
    tooltip,
    /aria-label="Controls how easily the audio triggers video seek jumps\."/,
  )
  assert.match(
    tooltip,
    /data-tooltip="Controls how easily the audio triggers video seek jumps\."/,
  )
})

test('escapes tooltip text for html attributes', () => {
  const tooltip = renderInfoTooltip('A "quote" & <tag>')

  assert.match(tooltip, /A &quot;quote&quot; &amp; &lt;tag&gt;/)
})
