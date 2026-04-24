import './style.css'
import {
  createGlitchSketch,
  formatTime,
  type BlockControls,
} from './glitchSketch'
import { loadStoredMedia, saveStoredMedia } from './mediaStorage'

const DEFAULT_BLOCK_CONTROLS: BlockControls = {
  spread: 62,
  density: 58,
  randomness: 44,
}

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

      <div class="settings-row slider-row">
        <label
          class="slider-field"
          title="Low keeps squares near center. High spreads them across the image."
        >
          <div class="slider-field__head">
            <span>Spread</span>
            <strong data-spread-value>${DEFAULT_BLOCK_CONTROLS.spread}%</strong>
          </div>
          <input
            data-spread-slider
            type="range"
            min="0"
            max="100"
            value="${DEFAULT_BLOCK_CONTROLS.spread}"
          />
        </label>

        <label
          class="slider-field"
          title="Low creates fewer blocks. High creates more nearby blocks."
        >
          <div class="slider-field__head">
            <span>Density</span>
            <strong data-density-value>${DEFAULT_BLOCK_CONTROLS.density}%</strong>
          </div>
          <input
            data-density-slider
            type="range"
            min="0"
            max="100"
            value="${DEFAULT_BLOCK_CONTROLS.density}"
          />
        </label>

        <label
          class="slider-field"
          title="Low keeps positions stable. High makes blocks jump more often."
        >
          <div class="slider-field__head">
            <span>Random</span>
            <strong data-randomness-value>${DEFAULT_BLOCK_CONTROLS.randomness}%</strong>
          </div>
          <input
            data-randomness-slider
            type="range"
            min="0"
            max="100"
            value="${DEFAULT_BLOCK_CONTROLS.randomness}"
          />
        </label>
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
const spreadSlider = document.querySelector<HTMLInputElement>('[data-spread-slider]')!
const densitySlider = document.querySelector<HTMLInputElement>('[data-density-slider]')!
const randomnessSlider = document.querySelector<HTMLInputElement>(
  '[data-randomness-slider]',
)!
const spreadValue = document.querySelector<HTMLElement>('[data-spread-value]')!
const densityValue = document.querySelector<HTMLElement>('[data-density-value]')!
const randomnessValue = document.querySelector<HTMLElement>(
  '[data-randomness-value]',
)!

const sketch = await createGlitchSketch({
  host: sketchHost,
})

const setSettingsOpen = (open: boolean) => {
  settingsPanel.classList.toggle('is-open', open)
  settingsToggle.setAttribute('aria-expanded', String(open))
  settingsToggle.textContent = open ? 'Hide settings' : 'Settings'
}

const readBlockControls = (): BlockControls => ({
  spread: Number(spreadSlider.value),
  density: Number(densitySlider.value),
  randomness: Number(randomnessSlider.value),
})

const syncBlockControls = () => {
  const controls = readBlockControls()
  spreadValue.textContent = `${controls.spread}%`
  densityValue.textContent = `${controls.density}%`
  randomnessValue.textContent = `${controls.randomness}%`
  sketch.setBlockControls(controls)
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

for (const slider of [spreadSlider, densitySlider, randomnessSlider]) {
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

syncBlockControls()
syncUi()
void restoreStoredMedia()
animateUi()

window.addEventListener('beforeunload', () => {
  sketch.dispose()
})
