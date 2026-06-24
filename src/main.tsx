import './style.css'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'

import {
  App,
  CONTROL_KEYS,
  DEFAULT_BLOCK_CONTROLS,
  FilterOrderItems,
  VIDEO_RHYTHM_CONTROL_FIELDS,
  type ControlKey,
} from './App'
import {
  getAudioMissingStatus,
  normalizeAudioSourceMode,
  isWavFileInputVisible,
  type AudioSourceMode,
} from './audioSource'
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
  DEFAULT_DEMO_AUDIO,
  DEFAULT_DEMO_VISUAL,
  loadDemoMediaFile,
} from './demoMedia'
import {
  canRecordVideo,
  canRenderVideo,
  getRenderButtonLabel,
} from './exportState'
import {
  loadStoredBlockControls,
  loadStoredAudioSourceMode,
  loadStoredFilterGroupState,
  loadStoredFilterOrder,
  loadStoredMedia,
  loadStoredVideoRhythmControls,
  saveStoredAudioSourceMode,
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

const appHost = document.querySelector<HTMLDivElement>('#app')!
const appRoot = createRoot(appHost)

flushSync(() => {
  appRoot.render(<App />)
})

const settingsPanel = document.querySelector<HTMLElement>('#settings-panel')!
const settingsToggle = document.querySelector<HTMLButtonElement>(
  '[data-settings-toggle]',
)!
const settingsClose = document.querySelector<HTMLButtonElement>(
  '[data-settings-close]',
)!
const settingsTabs = Array.from(
  document.querySelectorAll<HTMLButtonElement>('[data-settings-tab]'),
)
const settingsTabPanels = Array.from(
  document.querySelectorAll<HTMLElement>('[data-settings-tab-panel]'),
)
const imageInput = document.querySelector<HTMLInputElement>('[data-image-input]')!
const audioSource = document.querySelector<HTMLSelectElement>('[data-audio-source]')!
const audioFileField = document.querySelector<HTMLElement>(
  '[data-audio-file-field]',
)!
const audioInput = document.querySelector<HTMLInputElement>('[data-audio-input]')!
const audioDevice = document.querySelector<HTMLSelectElement>('[data-audio-device]')!
const audioInputConnect = document.querySelector<HTMLButtonElement>(
  '[data-audio-input-connect]',
)!
const audioInputControls = document.querySelector<HTMLElement>(
  '[data-audio-input-controls]',
)!
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
const audioInputName = document.querySelector<HTMLElement>(
  '[data-audio-input-name]',
)!
const currentTime = document.querySelector<HTMLElement>('[data-current-time]')!
const duration = document.querySelector<HTMLElement>('[data-duration]')!
const progress = document.querySelector<HTMLElement>('[data-progress]')!
const sketchHost = document.querySelector<HTMLElement>('#sketch-host')!
const filterOrderList = document.querySelector<HTMLElement>(
  '[data-filter-order-list]',
)!
const filterOrderRoot: Root = createRoot(filterOrderList)
const videoRhythmMode = document.querySelector<HTMLSelectElement>(
  '[data-video-rhythm-mode]',
)!
const videoRhythmShape = document.querySelector<HTMLSelectElement>(
  '[data-video-rhythm-shape]',
)!
const backdropEnabledInput = document.querySelector<HTMLInputElement>(
  '[data-backdrop-enabled]',
)!
const backdropTabButton = document.querySelector<HTMLButtonElement>(
  '[data-settings-tab="backdrop"]',
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
const filterTabButtons = new Map<FilterGroupKey, HTMLButtonElement>()
let filterOrder: FilterGroupKey[] = [...DEFAULT_FILTER_ORDER]
let filterGroupState: FilterGroupState = { ...DEFAULT_FILTER_GROUP_STATE }
let videoRhythmControls: VideoRhythmControls = {
  ...DEFAULT_VIDEO_RHYTHM_CONTROLS,
}
let lastBackdropIntensity = DEFAULT_BLOCK_CONTROLS.backdropIntensity

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
  filterTabButtons.set(
    key,
    document.querySelector<HTMLButtonElement>(`[data-settings-tab="${key}"]`)!,
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

const getSelectedAudioSourceMode = (): AudioSourceMode => {
  return normalizeAudioSourceMode(audioSource.value)
}

const refreshAudioInputDevices = async () => {
  if (!navigator.mediaDevices?.enumerateDevices) {
    audioDevice.replaceChildren(new Option('Default input', ''))
    return
  }

  const selectedDeviceId = audioDevice.value
  const devices = await navigator.mediaDevices.enumerateDevices()
  const audioInputs = devices.filter((device) => device.kind === 'audioinput')
  const options = [
    new Option('Default input', ''),
    ...audioInputs.map((device, index) => {
      return new Option(device.label || `Audio input ${index + 1}`, device.deviceId)
    }),
  ]

  audioDevice.replaceChildren(...options)

  if (audioInputs.some((device) => device.deviceId === selectedDeviceId)) {
    audioDevice.value = selectedDeviceId
  }
}

const syncAudioSourceControls = (mode = getSelectedAudioSourceMode()) => {
  const inputSupported = Boolean(navigator.mediaDevices?.getUserMedia)

  audioSource.value = mode
  audioInput.disabled = mode !== 'wav'
  audioFileField.classList.toggle('is-hidden', !isWavFileInputVisible(mode))
  audioDevice.disabled = mode !== 'input' || !inputSupported
  audioInputConnect.disabled = mode !== 'input' || !inputSupported
  audioInputControls.classList.toggle('is-visible', mode === 'input')
}

const sketch = await createGlitchSketch({
  host: sketchHost,
  onRecordingComplete: downloadRecording,
})

const renderFilterOrder = () => {
  flushSync(() => {
    filterOrderRoot.render(<FilterOrderItems filterOrder={filterOrder} />)
  })
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

    const tab = filterTabButtons.get(key)!
    tab.classList.toggle('is-disabled', !state.enabled)
    tab.classList.toggle('is-solo', state.solo)
    tab.classList.toggle('is-muted-by-solo', hasSolo && !state.solo)
  }
}

const applyBlockControls = (controls: Partial<BlockControls>) => {
  for (const key of CONTROL_KEYS) {
    const value = controls[key]

    if (typeof value === 'number') {
      controlSliders.get(key)!.value = String(value)

      if (key === 'backdropIntensity') {
        backdropEnabledInput.checked = value > 0
        backdropTabButton.classList.toggle('is-disabled', value <= 0)

        if (value > 0) {
          lastBackdropIntensity = value
        }
      }
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

const setActiveSettingsTab = (tabKey: string, focus = false) => {
  for (const tab of settingsTabs) {
    const active = tab.dataset.settingsTab === tabKey

    tab.classList.toggle('is-active', active)
    tab.setAttribute('aria-selected', String(active))
    tab.tabIndex = active ? 0 : -1

    if (active && focus) {
      tab.focus()
    }
  }

  for (const panel of settingsTabPanels) {
    const active = panel.dataset.settingsTabPanel === tabKey

    panel.classList.toggle('is-active', active)
    panel.hidden = !active
  }
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
  const backdropEnabled = controls.backdropIntensity > 0

  backdropEnabledInput.checked = backdropEnabled
  backdropTabButton.classList.toggle('is-disabled', !backdropEnabled)

  if (backdropEnabled) {
    lastBackdropIntensity = controls.backdropIntensity
  }

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

for (const tab of settingsTabs) {
  tab.addEventListener('click', () => {
    setActiveSettingsTab(tab.dataset.settingsTab!)
  })

  tab.addEventListener('keydown', (event) => {
    const currentIndex = settingsTabs.indexOf(tab)
    let nextIndex = currentIndex

    if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + settingsTabs.length) % settingsTabs.length
    } else if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % settingsTabs.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = settingsTabs.length - 1
    } else {
      return
    }

    event.preventDefault()
    setActiveSettingsTab(settingsTabs[nextIndex].dataset.settingsTab!, true)
  })
}

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
    audioSource.value = 'wav'
    syncAudioSourceControls('wav')
    saveStoredAudioSourceMode('wav')
    await saveStoredMedia('audio', file)
    audioName.textContent = file.name
    syncUi()
  } catch (error) {
    status.textContent =
      error instanceof Error ? error.message : 'Audio loading or saving failed.'
  }
})

audioSource.addEventListener('change', async () => {
  const mode = getSelectedAudioSourceMode()

  try {
    sketch.setAudioSourceMode(mode)
    syncAudioSourceControls(mode)
    saveStoredAudioSourceMode(mode)

    if (mode === 'input') {
      await refreshAudioInputDevices()
      status.textContent = 'Choose an audio input.'
    }

    syncUi()
  } catch (error) {
    audioSource.value = sketch.getSnapshot().audioSourceMode
    syncAudioSourceControls(sketch.getSnapshot().audioSourceMode)
    status.textContent =
      error instanceof Error ? error.message : 'Audio source change failed.'
  }
})

audioInputConnect.addEventListener('click', async () => {
  status.textContent = 'Connecting audio input...'

  try {
    await sketch.loadAudioInput(audioDevice.value || undefined)
    audioSource.value = 'input'
    syncAudioSourceControls('input')
    saveStoredAudioSourceMode('input')
    await refreshAudioInputDevices()

    const selectedOption = audioDevice.selectedOptions[0]
    audioInputName.textContent =
      selectedOption?.textContent?.trim() || 'Default input'
    syncUi()
  } catch (error) {
    status.textContent =
      error instanceof Error ? error.message : 'Audio input connection failed.'
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

backdropEnabledInput.addEventListener('change', () => {
  controlSliders.get('backdropIntensity')!.value = backdropEnabledInput.checked
    ? String(lastBackdropIntensity)
    : '0'
  syncBlockControls()
})

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
  syncAudioSourceControls(snapshot.audioSourceMode)

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
    status.textContent = 'Load image or video and WAV or audio input.'
    return
  }

  if (!snapshot.hasVisualMedia) {
    status.textContent = 'Image or video missing.'
    return
  }

  if (!snapshot.hasAudio) {
    status.textContent = getAudioMissingStatus(snapshot.audioSourceMode)
    return
  }

  status.textContent = snapshot.playing ? 'Playing.' : 'Ready.'
}

const animateUi = () => {
  syncUi()
  requestAnimationFrame(animateUi)
}

const restoreStoredMedia = async () => {
  status.textContent = 'Loading demo media...'
  const storedAudioSourceMode = loadStoredAudioSourceMode() ?? 'wav'

  try {
    const [storedImage, storedAudio] = await Promise.all([
      loadStoredMedia('image'),
      loadStoredMedia('audio'),
    ])
    const [visualFile, audioFile] = await Promise.all([
      storedImage ?? loadDemoMediaFile(DEFAULT_DEMO_VISUAL),
      storedAudio ?? loadDemoMediaFile(DEFAULT_DEMO_AUDIO),
    ])

    await sketch.loadVisualMedia(visualFile)
    imageName.textContent = storedImage
      ? visualFile.name
      : `Demo: ${visualFile.name}`

    await sketch.loadAudio(audioFile)
    audioName.textContent = storedAudio ? audioFile.name : `Demo: ${audioFile.name}`

    sketch.setAudioSourceMode(storedAudioSourceMode)
    audioSource.value = storedAudioSourceMode
    syncAudioSourceControls(storedAudioSourceMode)
  } catch (error) {
    status.textContent =
      error instanceof Error ? error.message : 'Default media could not be loaded.'
  }

  syncUi()
}

applyBlockControls(loadStoredBlockControls() ?? DEFAULT_BLOCK_CONTROLS)
applyFilterOrder(loadStoredFilterOrder() ?? DEFAULT_FILTER_ORDER)
applyFilterGroupState(loadStoredFilterGroupState() ?? DEFAULT_FILTER_GROUP_STATE)
applyVideoRhythmControls(
  loadStoredVideoRhythmControls() ?? DEFAULT_VIDEO_RHYTHM_CONTROLS,
)
syncAudioSourceControls(loadStoredAudioSourceMode() ?? 'wav')
void refreshAudioInputDevices()
syncBlockControls()
syncUi()
void restoreStoredMedia()
animateUi()

navigator.mediaDevices?.addEventListener('devicechange', () => {
  void refreshAudioInputDevices()
})

window.addEventListener('beforeunload', () => {
  sketch.dispose()
})
