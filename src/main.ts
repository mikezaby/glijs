import './style.css'
import {
  DEFAULT_FILTER_GROUP_STATE,
  DEFAULT_FILTER_ORDER,
  createGlitchSketch,
  formatTime,
  type BlockControls,
  type FilterGroupState,
  type FilterGroupKey,
} from './glitchSketch'
import {
  canRecordVideo,
  canRenderVideo,
  getRenderButtonLabel,
} from './exportState'
import { renderInfoTooltip } from './infoTooltip'
import {
  loadStoredBlockControls,
  loadStoredFilterGroupState,
  loadStoredFilterOrder,
  loadStoredMedia,
  loadStoredVideoRhythmControls,
  saveStoredBlockControls,
  saveStoredFilterGroupState,
  saveStoredFilterOrder,
  saveStoredMedia,
  saveStoredVideoRhythmControls,
} from './mediaStorage'
import {
  DEFAULT_VIDEO_RHYTHM_CONTROLS,
  type VideoRhythmControls,
  type VideoRhythmMode,
  type VideoRhythmShape,
} from './videoRhythm'

const DEFAULT_BLOCK_CONTROLS: BlockControls = {
  spread: 62,
  density: 58,
  size: 48,
  noise: 0,
  randomness: 44,
  tearCount: 55,
  tearHeight: 50,
  tearShift: 65,
  rgbAmount: 60,
  rgbOpacity: 65,
  rgbBalance: 50,
  rgbDrift: 35,
  rgbSaturation: 58,
  rgbAudioTint: 62,
  scanlineDensity: 55,
  scanlineOpacity: 45,
  streakCount: 45,
  streakLength: 60,
  streakOpacity: 50,
  backdropIntensity: 60,
}

type ControlKey = keyof BlockControls

type ControlGroup = {
  filterKey?: FilterGroupKey
  name: string
  controls: Array<{
    key: ControlKey
    label: string
    title: string
  }>
}

const CONTROL_GROUPS: ControlGroup[] = [
  {
    filterKey: 'squares',
    name: 'Squares',
    controls: [
      {
        key: 'spread',
        label: 'Spread',
        title: 'Low disables or centers squares. High spreads them across the canvas.',
      },
      {
        key: 'density',
        label: 'Density',
        title: 'Controls total active square area.',
      },
      {
        key: 'size',
        label: 'Size',
        title: 'Controls rendered square size.',
      },
      {
        key: 'noise',
        label: 'Noise',
        title: 'Adds grain inside displaced squares.',
      },
      {
        key: 'randomness',
        label: 'Random',
        title: 'Adds random movement on top of audio-derived positions.',
      },
    ],
  },
  {
    filterKey: 'tears',
    name: 'Tears',
    controls: [
      {
        key: 'tearCount',
        label: 'Count',
        title: 'Controls how many horizontal tears are drawn.',
      },
      {
        key: 'tearHeight',
        label: 'Height',
        title: 'Controls tear slice thickness.',
      },
      {
        key: 'tearShift',
        label: 'Shift',
        title: 'Controls horizontal tear displacement.',
      },
    ],
  },
  {
    filterKey: 'rgbSplit',
    name: 'RGB Split',
    controls: [
      {
        key: 'rgbAmount',
        label: 'Amount',
        title: 'Controls red/cyan channel offset.',
      },
      {
        key: 'rgbOpacity',
        label: 'Opacity',
        title: 'Controls channel split visibility.',
      },
      {
        key: 'rgbBalance',
        label: 'Balance',
        title: 'Manual bias between high-frequency red and bass-heavy cyan.',
      },
      {
        key: 'rgbDrift',
        label: 'Drift',
        title: 'Adds audio-moving hue changes inside the split colors.',
      },
      {
        key: 'rgbSaturation',
        label: 'Saturation',
        title: 'Controls how intense the split colors become.',
      },
      {
        key: 'rgbAudioTint',
        label: 'Audio tint',
        title: 'Uses spectrum analysis: bass pushes cyan/blue, highs push red, mids blend violet.',
      },
    ],
  },
  {
    filterKey: 'scanlines',
    name: 'Scanlines',
    controls: [
      {
        key: 'scanlineDensity',
        label: 'Density',
        title: 'Controls scanline spacing.',
      },
      {
        key: 'scanlineOpacity',
        label: 'Opacity',
        title: 'Controls scanline visibility.',
      },
    ],
  },
  {
    filterKey: 'streaks',
    name: 'Streaks',
    controls: [
      {
        key: 'streakCount',
        label: 'Count',
        title: 'Controls how many streaks are drawn.',
      },
      {
        key: 'streakLength',
        label: 'Length',
        title: 'Controls streak width.',
      },
      {
        key: 'streakOpacity',
        label: 'Opacity',
        title: 'Controls streak visibility.',
      },
    ],
  },
  {
    name: 'Backdrop',
    controls: [
      {
        key: 'backdropIntensity',
        label: 'Intensity',
        title: 'Controls background pulse and glow strength.',
      },
    ],
  },
]

const CONTROL_KEYS = CONTROL_GROUPS.flatMap((group) =>
  group.controls.map((control) => control.key),
)

const FILTER_GROUP_LABELS: Record<FilterGroupKey, string> = {
  rgbSplit: 'RGB Split',
  tears: 'Tears',
  squares: 'Squares',
  scanlines: 'Scanlines',
  streaks: 'Streaks',
}

const VIDEO_RHYTHM_CONTROL_FIELDS: Array<{
  key: keyof Omit<VideoRhythmControls, 'mode' | 'shape'>
  label: string
  title: string
  min: number
  max: number
}> = [
  {
    key: 'sensitivity',
    label: 'Sensitivity',
    title: 'Controls how easily the audio triggers video seek jumps.',
    min: 0,
    max: 100,
  },
  {
    key: 'bass',
    label: 'Bass',
    title: 'Controls how strongly bass energy pushes video seeking.',
    min: 0,
    max: 100,
  },
  {
    key: 'treble',
    label: 'Highs',
    title: 'Controls how strongly high frequencies push video seeking.',
    min: 0,
    max: 100,
  },
  {
    key: 'seekRange',
    label: 'Range',
    title: 'Controls how far from normal playback seek jumps can travel.',
    min: 0,
    max: 100,
  },
  {
    key: 'slices',
    label: 'Pieces',
    title: 'Controls how many strips or cubes are drawn in multi-seek mode.',
    min: 1,
    max: 200,
  },
  {
    key: 'motion',
    label: 'Motion',
    title: 'Controls how randomly strips or cubes move around the picture.',
    min: 0,
    max: 100,
  },
  {
    key: 'mergeDelay',
    label: 'Merge delay',
    title: 'Controls how long quiet sections wait before older seeks cascade through the pieces.',
    min: 0,
    max: 10,
  },
]

const renderControlGroup = (group: ControlGroup) => `
  <section class="control-group" ${group.filterKey ? `data-filter-control-group="${group.filterKey}"` : ''}>
    <div class="control-group__head">
      <h2>${group.name}</h2>
      ${
        group.filterKey
          ? `
            <div class="filter-toggles" aria-label="${group.name} filter controls">
              <label class="toggle-field">
                <input
                  data-filter-enabled="${group.filterKey}"
                  type="checkbox"
                  checked
                />
                <span>Enable</span>
              </label>
              <label class="toggle-field toggle-field--solo">
                <input data-filter-solo="${group.filterKey}" type="checkbox" />
                <span>Solo</span>
              </label>
            </div>
          `
          : ''
      }
    </div>
    <div class="settings-row slider-row">
      ${group.controls
        .map(
          (control) => `
            <label class="slider-field" title="${control.title}">
              <div class="slider-field__head">
                <span class="field-label">
                  ${control.label}
                  ${renderInfoTooltip(control.title)}
                </span>
                <strong data-control-value="${control.key}">
                  ${DEFAULT_BLOCK_CONTROLS[control.key]}%
                </strong>
              </div>
              <input
                data-control-slider="${control.key}"
                type="range"
                min="0"
                max="100"
                value="${DEFAULT_BLOCK_CONTROLS[control.key]}"
              />
            </label>
          `,
        )
        .join('')}
    </div>
  </section>
`

const renderVideoRhythmControls = () => `
  <section class="control-group">
    <div class="control-group__head">
      <h2>Video rhythm</h2>
    </div>
    <label class="select-field" title="Controls how video time reacts to the WAV analysis.">
      <span class="field-label">
        Mode
        ${renderInfoTooltip('Controls how video time reacts to the WAV analysis.')}
      </span>
      <select data-video-rhythm-mode>
        <option value="normal">Normal playback</option>
        <option value="seek">Rhythm seek</option>
        <option value="multi">Multi-seek slices</option>
      </select>
    </label>
    <label class="select-field" title="Controls the visual structure used by multi-seek mode.">
      <span class="field-label">
        Shape
        ${renderInfoTooltip('Controls the visual structure used by multi-seek mode.')}
      </span>
      <select data-video-rhythm-shape>
        <option value="strips">Strips</option>
        <option value="cubes">Cubes</option>
      </select>
    </label>
    <div class="settings-row slider-row">
      ${VIDEO_RHYTHM_CONTROL_FIELDS.map(
        (control) => `
          <label class="slider-field" title="${control.title}">
            <div class="slider-field__head">
              <span class="field-label">
                ${control.label}
                ${renderInfoTooltip(control.title)}
              </span>
              <strong data-video-rhythm-value="${control.key}">
                ${DEFAULT_VIDEO_RHYTHM_CONTROLS[control.key]}
              </strong>
            </div>
            <input
              data-video-rhythm-slider="${control.key}"
              type="range"
              min="${control.min}"
              max="${control.max}"
              value="${DEFAULT_VIDEO_RHYTHM_CONTROLS[control.key]}"
            />
          </label>
        `,
      ).join('')}
    </div>
  </section>
`

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="shell">
    <button
      data-settings-toggle
      class="settings-toggle is-open"
      type="button"
      aria-expanded="true"
      aria-controls="settings-panel"
      aria-label="Hide settings"
    >
      <span class="settings-toggle__grip" aria-hidden="true"></span>
    </button>

    <section class="stage">
      <div id="sketch-host" class="sketch-host"></div>
    </section>

    <aside id="settings-panel" class="settings is-open" aria-label="Visual settings">
      <div class="settings__header">
        <span>Settings</span>
        <button data-settings-close class="settings__close" type="button" aria-label="Hide settings">
          Close
        </button>
      </div>

      <div class="settings-row media-row">
        <label class="file-field">
          <span>Image / video</span>
          <input data-image-input type="file" accept="image/*,video/*" />
          <small data-image-name>No visual media</small>
        </label>

        <label class="file-field">
          <span>WAV</span>
          <input data-audio-input type="file" accept=".wav,audio/wav" />
          <small data-audio-name>No audio</small>
        </label>

        <div class="transport">
          <button data-play type="button" class="transport__button" disabled>
            Play
          </button>
          <button data-record-video type="button" class="transport__button transport__button--secondary" disabled>
            Record video
          </button>
          <button data-render-video type="button" class="transport__button transport__button--secondary" disabled>
            Render & download
          </button>
          <div class="transport__time">
            <span data-current-time>00:00</span>
            <span>/</span>
            <span data-duration>00:00</span>
          </div>
        </div>
      </div>

      <div class="progress" aria-hidden="true">
        <div class="progress__fill" data-progress></div>
      </div>

      <p class="status" data-status>Load image or video and WAV.</p>

      ${renderVideoRhythmControls()}

      <section class="control-group">
        <h2>Filter order</h2>
        <div class="filter-order" data-filter-order-list></div>
      </section>

      <div class="control-groups">
        ${CONTROL_GROUPS.map(renderControlGroup).join('')}
      </div>
    </aside>
  </main>
`

const settingsPanel = document.querySelector<HTMLElement>('#settings-panel')!
const settingsToggle = document.querySelector<HTMLButtonElement>(
  '[data-settings-toggle]',
)!
const settingsClose = document.querySelector<HTMLButtonElement>(
  '[data-settings-close]',
)!
const imageInput = document.querySelector<HTMLInputElement>('[data-image-input]')!
const audioInput = document.querySelector<HTMLInputElement>('[data-audio-input]')!
const playButton = document.querySelector<HTMLButtonElement>('[data-play]')!
const recordButton = document.querySelector<HTMLButtonElement>(
  '[data-record-video]',
)!
const renderButton = document.querySelector<HTMLButtonElement>(
  '[data-render-video]',
)!
const status = document.querySelector<HTMLElement>('[data-status]')!
const imageName = document.querySelector<HTMLElement>('[data-image-name]')!
const audioName = document.querySelector<HTMLElement>('[data-audio-name]')!
const currentTime = document.querySelector<HTMLElement>('[data-current-time]')!
const duration = document.querySelector<HTMLElement>('[data-duration]')!
const progress = document.querySelector<HTMLElement>('[data-progress]')!
const sketchHost = document.querySelector<HTMLElement>('#sketch-host')!
const filterOrderList = document.querySelector<HTMLElement>(
  '[data-filter-order-list]',
)!
const videoRhythmMode = document.querySelector<HTMLSelectElement>(
  '[data-video-rhythm-mode]',
)!
const videoRhythmShape = document.querySelector<HTMLSelectElement>(
  '[data-video-rhythm-shape]',
)!
const controlSliders = new Map<ControlKey, HTMLInputElement>()
const controlValues = new Map<ControlKey, HTMLElement>()
const videoRhythmSliders = new Map<
  keyof Omit<VideoRhythmControls, 'mode' | 'shape'>,
  HTMLInputElement
>()
const videoRhythmValues = new Map<
  keyof Omit<VideoRhythmControls, 'mode' | 'shape'>,
  HTMLElement
>()
const filterEnabledInputs = new Map<FilterGroupKey, HTMLInputElement>()
const filterSoloInputs = new Map<FilterGroupKey, HTMLInputElement>()
const filterGroupSections = new Map<FilterGroupKey, HTMLElement>()
let filterOrder: FilterGroupKey[] = [...DEFAULT_FILTER_ORDER]
let filterGroupState: FilterGroupState = { ...DEFAULT_FILTER_GROUP_STATE }
let videoRhythmControls: VideoRhythmControls = {
  ...DEFAULT_VIDEO_RHYTHM_CONTROLS,
}

for (const key of CONTROL_KEYS) {
  controlSliders.set(
    key,
    document.querySelector<HTMLInputElement>(`[data-control-slider="${key}"]`)!,
  )
  controlValues.set(
    key,
    document.querySelector<HTMLElement>(`[data-control-value="${key}"]`)!,
  )
}

for (const control of VIDEO_RHYTHM_CONTROL_FIELDS) {
  videoRhythmSliders.set(
    control.key,
    document.querySelector<HTMLInputElement>(
      `[data-video-rhythm-slider="${control.key}"]`,
    )!,
  )
  videoRhythmValues.set(
    control.key,
    document.querySelector<HTMLElement>(
      `[data-video-rhythm-value="${control.key}"]`,
    )!,
  )
}

for (const key of DEFAULT_FILTER_ORDER) {
  filterEnabledInputs.set(
    key,
    document.querySelector<HTMLInputElement>(`[data-filter-enabled="${key}"]`)!,
  )
  filterSoloInputs.set(
    key,
    document.querySelector<HTMLInputElement>(`[data-filter-solo="${key}"]`)!,
  )
  filterGroupSections.set(
    key,
    document.querySelector<HTMLElement>(`[data-filter-control-group="${key}"]`)!,
  )
}

let statusOverride: { text: string; expiresAt: number } | null = null

const setStatusOverride = (text: string, durationMs = 2500) => {
  statusOverride = {
    text,
    expiresAt: Date.now() + durationMs,
  }
}

const downloadRecording = (recording: Blob) => {
  if (recording.size === 0) {
    setStatusOverride('Recording produced no video data.', 3500)
    return
  }

  const url = URL.createObjectURL(recording)
  const link = document.createElement('a')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const extension = recording.type.includes('mp4') ? 'mp4' : 'webm'

  link.href = url
  link.download = `glijs-recording-${stamp}.${extension}`
  document.body.append(link)
  link.click()
  link.remove()

  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 30_000)
  setStatusOverride('Video downloaded.', 3500)
}

const sketch = await createGlitchSketch({
  host: sketchHost,
  onRecordingComplete: downloadRecording,
})

const renderFilterOrder = () => {
  filterOrderList.innerHTML = filterOrder
    .map(
      (key, index) => `
        <div class="filter-order__item" data-filter-order-item="${key}">
          <span>${index + 1}. ${FILTER_GROUP_LABELS[key]}</span>
          <div class="filter-order__actions">
            <button
              type="button"
              data-filter-move="${key}"
              data-filter-direction="up"
              ${index === 0 ? 'disabled' : ''}
              aria-label="Move ${FILTER_GROUP_LABELS[key]} earlier"
            >
              Up
            </button>
            <button
              type="button"
              data-filter-move="${key}"
              data-filter-direction="down"
              ${index === filterOrder.length - 1 ? 'disabled' : ''}
              aria-label="Move ${FILTER_GROUP_LABELS[key]} later"
            >
              Down
            </button>
          </div>
        </div>
      `,
    )
    .join('')
}

const applyFilterOrder = (nextOrder: FilterGroupKey[]) => {
  const ordered = nextOrder.filter((key, index) => {
    return DEFAULT_FILTER_ORDER.includes(key) && nextOrder.indexOf(key) === index
  })
  const missing = DEFAULT_FILTER_ORDER.filter((key) => !ordered.includes(key))

  filterOrder = [...ordered, ...missing]
  sketch.setFilterOrder(filterOrder)
  saveStoredFilterOrder(filterOrder)
  renderFilterOrder()
}

const applyFilterGroupState = (nextState: FilterGroupState) => {
  filterGroupState = nextState
  sketch.setFilterGroupState(filterGroupState)
  saveStoredFilterGroupState(filterGroupState)

  const hasSolo = DEFAULT_FILTER_ORDER.some((key) => filterGroupState[key].solo)

  for (const key of DEFAULT_FILTER_ORDER) {
    const state = filterGroupState[key]
    const section = filterGroupSections.get(key)!

    filterEnabledInputs.get(key)!.checked = state.enabled
    filterSoloInputs.get(key)!.checked = state.solo
    section.classList.toggle('is-disabled', !state.enabled)
    section.classList.toggle('is-solo', state.solo)
    section.classList.toggle('is-muted-by-solo', hasSolo && !state.solo)
  }
}

const applyBlockControls = (controls: Partial<BlockControls>) => {
  for (const key of CONTROL_KEYS) {
    const value = controls[key]

    if (typeof value === 'number') {
      controlSliders.get(key)!.value = String(value)
    }
  }
}

const applyVideoRhythmControls = (controls: VideoRhythmControls) => {
  videoRhythmControls = controls
  videoRhythmMode.value = controls.mode
  videoRhythmShape.value = controls.shape

  for (const field of VIDEO_RHYTHM_CONTROL_FIELDS) {
    videoRhythmSliders.get(field.key)!.value = String(controls[field.key])
    videoRhythmValues.get(field.key)!.textContent =
      field.key === 'slices' ? String(controls[field.key]) : `${controls[field.key]}%`
  }

  sketch.setVideoRhythmControls(videoRhythmControls)
  saveStoredVideoRhythmControls(videoRhythmControls)
}

const setSettingsOpen = (open: boolean) => {
  settingsPanel.classList.toggle('is-open', open)
  settingsToggle.classList.toggle('is-open', open)
  settingsToggle.setAttribute('aria-expanded', String(open))
  settingsToggle.setAttribute('aria-label', open ? 'Hide settings' : 'Show settings')
}

const readBlockControls = (): BlockControls => {
  return CONTROL_KEYS.reduce<BlockControls>(
    (controls, key) => ({
      ...controls,
      [key]: Number(controlSliders.get(key)!.value),
    }),
    { ...DEFAULT_BLOCK_CONTROLS },
  )
}

const syncBlockControls = () => {
  const controls = readBlockControls()

  for (const key of CONTROL_KEYS) {
    controlValues.get(key)!.textContent = `${controls[key]}%`
  }

  sketch.setBlockControls(controls)
  saveStoredBlockControls(controls)
}

const readVideoRhythmControls = (): VideoRhythmControls => {
  return {
    mode: videoRhythmMode.value as VideoRhythmMode,
    shape: videoRhythmShape.value as VideoRhythmShape,
    sensitivity: Number(videoRhythmSliders.get('sensitivity')!.value),
    bass: Number(videoRhythmSliders.get('bass')!.value),
    treble: Number(videoRhythmSliders.get('treble')!.value),
    seekRange: Number(videoRhythmSliders.get('seekRange')!.value),
    slices: Number(videoRhythmSliders.get('slices')!.value),
    motion: Number(videoRhythmSliders.get('motion')!.value),
    mergeDelay: Number(videoRhythmSliders.get('mergeDelay')!.value),
  }
}

settingsToggle.addEventListener('click', () => {
  setSettingsOpen(!settingsPanel.classList.contains('is-open'))
})

settingsClose.addEventListener('click', () => {
  setSettingsOpen(false)
})

imageInput.addEventListener('change', async () => {
  const file = imageInput.files?.[0]
  if (!file) {
    return
  }

  status.textContent = 'Loading image...'

  try {
    await sketch.loadVisualMedia(file)
    await saveStoredMedia('image', file)
    imageName.textContent = file.name
    syncUi()
  } catch (error) {
    status.textContent =
      error instanceof Error ? error.message : 'Visual media loading or saving failed.'
  }
})

audioInput.addEventListener('change', async () => {
  const file = audioInput.files?.[0]
  if (!file) {
    return
  }

  status.textContent = 'Loading WAV...'

  try {
    await sketch.loadAudio(file)
    await saveStoredMedia('audio', file)
    audioName.textContent = file.name
    syncUi()
  } catch (error) {
    status.textContent =
      error instanceof Error ? error.message : 'Audio loading or saving failed.'
  }
})

playButton.addEventListener('click', async () => {
  try {
    await sketch.togglePlayback()
    syncUi()
  } catch (error) {
    status.textContent =
      error instanceof Error ? error.message : 'Playback failed to start.'
  }
})

recordButton.addEventListener('click', async () => {
  try {
    if (sketch.getSnapshot().recording) {
      setStatusOverride('Preparing video download...', 5000)
      await sketch.stopVideoRecording()
    } else {
      setStatusOverride('Recording video...', 5000)
      await sketch.startVideoRecording()
    }
    syncUi()
  } catch (error) {
    setStatusOverride(
      error instanceof Error ? error.message : 'Video recording failed.',
      4500,
    )
  }
})

renderButton.addEventListener('click', async () => {
  try {
    setStatusOverride('Rendering video for download...', 5000)
    await sketch.renderVideoRecording()
    syncUi()
  } catch (error) {
    setStatusOverride(
      error instanceof Error ? error.message : 'Video render failed.',
      4500,
    )
  }
})

filterOrderList.addEventListener('click', (event) => {
  const target = event.target

  if (!(target instanceof HTMLButtonElement)) {
    return
  }

  const key = target.dataset.filterMove as FilterGroupKey | undefined
  const direction = target.dataset.filterDirection

  if (!key || !DEFAULT_FILTER_ORDER.includes(key)) {
    return
  }

  const currentIndex = filterOrder.indexOf(key)
  const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= filterOrder.length) {
    return
  }

  const nextOrder = [...filterOrder]
  nextOrder[currentIndex] = filterOrder[nextIndex]
  nextOrder[nextIndex] = key
  applyFilterOrder(nextOrder)
})

const readFilterGroupState = (): FilterGroupState => {
  return DEFAULT_FILTER_ORDER.reduce<FilterGroupState>(
    (state, key) => ({
      ...state,
      [key]: {
        enabled: filterEnabledInputs.get(key)!.checked,
        solo: filterSoloInputs.get(key)!.checked,
      },
    }),
    { ...DEFAULT_FILTER_GROUP_STATE },
  )
}

for (const input of [
  ...filterEnabledInputs.values(),
  ...filterSoloInputs.values(),
]) {
  input.addEventListener('change', () => {
    applyFilterGroupState(readFilterGroupState())
  })
}

for (const slider of controlSliders.values()) {
  slider.addEventListener('input', () => {
    syncBlockControls()
  })
}

videoRhythmMode.addEventListener('change', () => {
  applyVideoRhythmControls(readVideoRhythmControls())
})

videoRhythmShape.addEventListener('change', () => {
  applyVideoRhythmControls(readVideoRhythmControls())
})

for (const slider of videoRhythmSliders.values()) {
  slider.addEventListener('input', () => {
    applyVideoRhythmControls(readVideoRhythmControls())
  })
}

const syncUi = () => {
  const snapshot = sketch.getSnapshot()
  const progressRatio =
    snapshot.duration > 0 ? snapshot.currentTime / snapshot.duration : 0

  playButton.disabled =
    !snapshot.hasAudio || snapshot.recording || snapshot.rendering
  playButton.textContent = snapshot.playing ? 'Pause' : 'Play'
  recordButton.disabled = !canRecordVideo(snapshot)
  recordButton.textContent = snapshot.recording
    ? 'Stop & download'
    : 'Record video'
  renderButton.disabled = !canRenderVideo(snapshot)
  renderButton.textContent = getRenderButtonLabel(snapshot)
  currentTime.textContent = formatTime(snapshot.currentTime)
  duration.textContent = formatTime(snapshot.duration)
  progress.style.width = `${Math.min(100, Math.max(0, progressRatio * 100))}%`

  if (snapshot.rendering) {
    status.textContent = 'Rendering video for download...'
    return
  }

  if (snapshot.recording) {
    status.textContent = 'Recording video...'
    return
  }

  if (statusOverride && Date.now() < statusOverride.expiresAt) {
    status.textContent = statusOverride.text
    return
  }

  statusOverride = null

  if (!snapshot.hasVisualMedia && !snapshot.hasAudio) {
    status.textContent = 'Load image or video and WAV.'
    return
  }

  if (!snapshot.hasVisualMedia) {
    status.textContent = 'Image or video missing.'
    return
  }

  if (!snapshot.hasAudio) {
    status.textContent = 'WAV missing.'
    return
  }

  status.textContent = snapshot.playing ? 'Playing.' : 'Ready.'
}

const animateUi = () => {
  syncUi()
  requestAnimationFrame(animateUi)
}

const restoreStoredMedia = async () => {
  status.textContent = 'Restoring saved media...'

  try {
    const [storedImage, storedAudio] = await Promise.all([
      loadStoredMedia('image'),
      loadStoredMedia('audio'),
    ])

    if (storedImage) {
      await sketch.loadVisualMedia(storedImage)
      imageName.textContent = storedImage.name
    }

    if (storedAudio) {
      await sketch.loadAudio(storedAudio)
      audioName.textContent = storedAudio.name
    }
  } catch (error) {
    status.textContent =
      error instanceof Error ? error.message : 'Saved media could not be restored.'
  }

  syncUi()
}

applyBlockControls(loadStoredBlockControls() ?? DEFAULT_BLOCK_CONTROLS)
applyFilterOrder(loadStoredFilterOrder() ?? DEFAULT_FILTER_ORDER)
applyFilterGroupState(loadStoredFilterGroupState() ?? DEFAULT_FILTER_GROUP_STATE)
applyVideoRhythmControls(
  loadStoredVideoRhythmControls() ?? DEFAULT_VIDEO_RHYTHM_CONTROLS,
)
syncBlockControls()
syncUi()
void restoreStoredMedia()
animateUi()

window.addEventListener('beforeunload', () => {
  sketch.dispose()
})
