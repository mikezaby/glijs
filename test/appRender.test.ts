import assert from 'node:assert/strict'
import test from 'node:test'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  App,
  CONTROL_GROUPS,
  DEFAULT_FILTER_ORDER,
  FilterOrderItems,
  InfoTooltip,
} from '../src/App.tsx'

test('renders the application shell and controls through React components', () => {
  const markup = renderToStaticMarkup(
    React.createElement(App),
  )

  assert.match(markup, /<main class="flex flex-col h-screen overflow-hidden">/)
  assert.match(markup, /id="sketch-host"/)
  assert.match(markup, /data-image-input="true"/)
  assert.match(markup, /data-audio-source="true"/)
  assert.match(markup, /data-audio-file-field="true"/)
  assert.match(markup, /data-audio-input="true"/)
  assert.match(markup, /data-video-rhythm-mode="true"/)
  assert.match(markup, /aria-label="Spread"/)
  assert.match(markup, /data-filter-order-item/)
  assert.match(markup, /data-filter-enabled="rgbSplit"/)
})

test('shows input device controls only in input audio source mode', () => {
  const wavMarkup = renderToStaticMarkup(React.createElement(App, { audioSourceMode: 'wav' }))
  assert.doesNotMatch(wavMarkup, /data-audio-device="true"/)
  assert.doesNotMatch(wavMarkup, /data-audio-input-connect="true"/)

  const inputMarkup = renderToStaticMarkup(React.createElement(App, { audioSourceMode: 'input' }))
  assert.match(inputMarkup, /data-audio-device="true"/)
  assert.match(inputMarkup, /data-audio-input-connect="true"/)
  assert.doesNotMatch(inputMarkup, /data-audio-file-field="true"/)
})

test('renders bottom settings tabs with one panel for every effect', () => {
  const markup = renderToStaticMarkup(
    React.createElement(App),
  )

  assert.match(markup, /data-settings-tabs="true"[^>]*role="tablist"/)
  assert.match(
    markup,
    /data-settings-tab="squares"[^>]*role="tab"[^>]*aria-selected="true"/,
  )

  for (const group of CONTROL_GROUPS) {
    const tabKey = group.filterKey ?? 'backdrop'

    assert.match(
      markup,
      new RegExp(
        `data-settings-tab="${tabKey}"[^>]*aria-controls="settings-tab-panel-${tabKey}"`,
      ),
    )
    assert.match(
      markup,
      new RegExp(
        `id="settings-tab-panel-${tabKey}"[^>]*data-settings-tab-panel="${tabKey}"[^>]*role="tabpanel"`,
      ),
    )
  }

  assert.match(markup, /role="switch"[^>]*data-backdrop-enabled="true"/)
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
