import './style.css'
import {
  createGlitchSketch,
  formatTime,
  type BlockControls,
} from './glitchSketch'
import {
  loadStoredBlockControls,
  loadStoredMedia,
  saveStoredBlockControls,
  saveStoredMedia,
} from './mediaStorage'

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
  scanlineDensity: 55,
  scanlineOpacity: 45,
  streakCount: 45,
  streakLength: 60,
  streakOpacity: 50,
  backdropIntensity: 60,
}

type ControlKey = keyof BlockControls

type ControlGroup = {
  name: string
  controls: Array<{
    key: ControlKey
    label: string
    title: string
  }>
}

const CONTROL_GROUPS: ControlGroup[] = [
  {
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
    ],
  },
  {
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

const renderControlGroup = (group: ControlGroup) => `
  <section class="control-group">
    <h2>${group.name}</h2>
    <div class="settings-row slider-row">
      ${group.controls
        .map(
          (control) => `
            <label class="slider-field" title="${control.title}">
              <div class="slider-field__head">
                <span>${control.label}</span>
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

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="shell">
    <button
      data-settings-toggle
      class="settings-toggle"
      type="button"
      aria-expanded="true"
      aria-controls="settings-panel"
    >
      Settings
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
          <span>Image</span>
          <input data-image-input type="file" accept="image/*" />
          <small data-image-name>No image</small>
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

      <p class="status" data-status>Load image and WAV.</p>

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
const status = document.querySelector<HTMLElement>('[data-status]')!
const imageName = document.querySelector<HTMLElement>('[data-image-name]')!
const audioName = document.querySelector<HTMLElement>('[data-audio-name]')!
const currentTime = document.querySelector<HTMLElement>('[data-current-time]')!
const duration = document.querySelector<HTMLElement>('[data-duration]')!
const progress = document.querySelector<HTMLElement>('[data-progress]')!
const sketchHost = document.querySelector<HTMLElement>('#sketch-host')!
const controlSliders = new Map<ControlKey, HTMLInputElement>()
const controlValues = new Map<ControlKey, HTMLElement>()

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

const sketch = await createGlitchSketch({
  host: sketchHost,
})

const applyBlockControls = (controls: Partial<BlockControls>) => {
  for (const key of CONTROL_KEYS) {
    const value = controls[key]

    if (typeof value === 'number') {
      controlSliders.get(key)!.value = String(value)
    }
  }
}

const setSettingsOpen = (open: boolean) => {
  settingsPanel.classList.toggle('is-open', open)
  settingsToggle.setAttribute('aria-expanded', String(open))
  settingsToggle.textContent = open ? 'Hide settings' : 'Settings'
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
    await sketch.loadImage(file)
    await saveStoredMedia('image', file)
    imageName.textContent = file.name
    syncUi()
  } catch (error) {
    status.textContent =
      error instanceof Error ? error.message : 'Image loading or saving failed.'
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

for (const slider of controlSliders.values()) {
  slider.addEventListener('input', () => {
    syncBlockControls()
  })
}

const syncUi = () => {
  const snapshot = sketch.getSnapshot()
  const progressRatio =
    snapshot.duration > 0 ? snapshot.currentTime / snapshot.duration : 0

  playButton.disabled = !snapshot.hasAudio
  playButton.textContent = snapshot.playing ? 'Pause' : 'Play'
  currentTime.textContent = formatTime(snapshot.currentTime)
  duration.textContent = formatTime(snapshot.duration)
  progress.style.width = `${Math.min(100, Math.max(0, progressRatio * 100))}%`

  if (!snapshot.hasImage && !snapshot.hasAudio) {
    status.textContent = 'Load image and WAV.'
    return
  }

  if (!snapshot.hasImage) {
    status.textContent = 'Image missing.'
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
      await sketch.loadImage(storedImage)
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
syncBlockControls()
syncUi()
void restoreStoredMedia()
animateUi()

window.addEventListener('beforeunload', () => {
  sketch.dispose()
})
