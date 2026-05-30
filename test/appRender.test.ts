import assert from 'node:assert/strict'
import test from 'node:test'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  App,
  DEFAULT_FILTER_ORDER,
  FilterOrderItems,
  InfoTooltip,
} from '../src/App.tsx'

test('renders the application shell and controls through React components', () => {
  const markup = renderToStaticMarkup(
    React.createElement(App),
  )

  assert.match(markup, /<main class="shell">/)
  assert.match(markup, /id="sketch-host"/)
  assert.match(markup, /data-image-input="true"/)
  assert.match(markup, /data-audio-source="true"/)
  assert.match(markup, /data-audio-file-field="true"/)
  assert.match(markup, /data-audio-input="true"/)
  assert.match(markup, /data-audio-device="true"/)
  assert.match(markup, /data-audio-input-connect="true"/)
  assert.match(markup, /data-video-rhythm-mode="true"/)
  assert.match(markup, /data-control-slider="spread"/)
  assert.match(markup, /data-filter-enabled="rgbSplit"/)
  assert.match(markup, /data-filter-order-list="true"/)
})

test('escapes tooltip text through React attributes', () => {
  const markup = renderToStaticMarkup(
    React.createElement(InfoTooltip, { text: 'A "quote" & <tag>' }),
  )

  assert.match(markup, /aria-label="A &quot;quote&quot; &amp; &lt;tag&gt;"/)
  assert.match(markup, /data-tooltip="A &quot;quote&quot; &amp; &lt;tag&gt;"/)
})

test('renders filter order controls with disabled first and last moves', () => {
  const markup = renderToStaticMarkup(
    React.createElement(FilterOrderItems, {
      filterOrder: ['tears', 'rgbSplit', 'squares'],
    }),
  )

  assert.match(markup, /data-filter-order-item="tears"/)
  assert.match(
    markup,
    /data-filter-move="tears" data-filter-direction="up" disabled="" aria-label="Move Tears earlier"/,
  )
  assert.match(markup, /aria-label="Move RGB Split earlier"/)
  assert.match(
    markup,
    /data-filter-move="squares" data-filter-direction="down" disabled="" aria-label="Move Squares later"/,
  )
})
