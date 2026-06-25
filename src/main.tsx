import './styles/index.css'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'

import {
  App,
  CONTROL_KEYS,
  DEFAULT_BLOCK_CONTROLS,
  FilterOrderItems,
  type AppProps,
  type AudioDeviceOption,
  type SketchUISnapshot,
} from './App'
import {
  getAudioMissingStatus,
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
} from './videoRhythm'
import { UIProvider, themeToCssVariables } from '@blibliki/ui'
import { glijsUITheme } from './theme/uiTheme'

document.documentElement.classList.add('dark')
const cssVars = themeToCssVariables(glijsUITheme, 'dark')
for (const [name, value] of Object.entries(cssVars)) {
  document.documentElement.style.setProperty(name, value)
}

const appHost = document.querySelector<HTMLDivElement>('#app')!
const appRoot = createRoot(appHost)

let appProps: AppProps = {}
let currentAudioDevices: AudioDeviceOption[] = []

const rerenderApp = () => {
  flushSync(() => {
    appRoot.render(
      <UIProvider mode="dark" theme={glijsUITheme}>
        <App {...appProps} />
      </UIProvider>
    )
  })
}

const sketchHost = document.querySelector<HTMLElement>('#sketch-host')!
const filterOrderList = document.querySelector<HTMLElement>(
  '[data-filter-order-list]',
)!
const filterOrderRoot: Root = createRoot(filterOrderList)

let filterOrder: FilterGroupKey[] = [...DEFAULT_FILTER_ORDER]
let filterGroupState: FilterGroupState = { ...DEFAULT_FILTER_GROUP_STATE }
let videoRhythmControls: VideoRhythmControls = {
  ...DEFAULT_VIDEO_RHYTHM_CONTROLS,
}
let blockControls: BlockControls = { ...DEFAULT_BLOCK_CONTROLS }
let lastBackdropIntensity = DEFAULT_BLOCK_CONTROLS.backdropIntensity

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

const computeStatus = (snapshot: ReturnType<typeof sketch.getSnapshot>): string => {
  if (snapshot.rendering) return 'Rendering video for download...'
  if (snapshot.recording) return 'Recording video...'
  if (statusOverride && Date.now() < statusOverride.expiresAt) return statusOverride.text
  statusOverride = null
  if (!snapshot.hasVisualMedia && !snapshot.hasAudio) return 'Load image or video and WAV or audio input.'
  if (!snapshot.hasVisualMedia) return 'Image or video missing.'
  if (!snapshot.hasAudio) return getAudioMissingStatus(snapshot.audioSourceMode)
  return snapshot.playing ? 'Playing.' : 'Ready.'
}

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
}

const applyBlockControls = (controls: Partial<BlockControls>) => {
  for (const key of CONTROL_KEYS) {
    const value = controls[key]
    if (typeof value === 'number') {
      blockControls = { ...blockControls, [key]: value }
      if (key === 'backdropIntensity' && value > 0) lastBackdropIntensity = value
    }
  }
}

const applyVideoRhythmControls = (controls: VideoRhythmControls) => {
  videoRhythmControls = controls
  sketch.setVideoRhythmControls(videoRhythmControls)
  saveStoredVideoRhythmControls(videoRhythmControls)
}

const refreshAudioInputDevices = async () => {
  if (!navigator.mediaDevices?.enumerateDevices) {
    currentAudioDevices = []
    appProps = { ...appProps, audioDevices: [] }
    rerenderApp()
    return
  }
  const devices = await navigator.mediaDevices.enumerateDevices()
  currentAudioDevices = devices
    .filter((d) => d.kind === 'audioinput')
    .map((d, i) => ({ id: d.deviceId, label: d.label || `Audio input ${i + 1}` }))
  appProps = { ...appProps, audioDevices: currentAudioDevices }
  rerenderApp()
}

const syncUi = () => {
  const snapshot = sketch.getSnapshot()
  const progressRatio = snapshot.duration > 0 ? snapshot.currentTime / snapshot.duration : 0

  const uiSnapshot: SketchUISnapshot = {
    playing: snapshot.playing,
    recording: snapshot.recording,
    rendering: snapshot.rendering,
    hasAudio: snapshot.hasAudio,
    hasVisualMedia: snapshot.hasVisualMedia,
    currentTime: formatTime(snapshot.currentTime),
    duration: formatTime(snapshot.duration),
    progressPercent: Math.min(100, Math.max(0, progressRatio * 100)),
  }

  appProps = {
    ...appProps,
    blockControls,
    filterGroupState,
    filterOrder,
    videoRhythmControls,
    audioDevices: currentAudioDevices,
    lastBackdropIntensity,
    snapshot: uiSnapshot,
    status: computeStatus(snapshot),
  }
  rerenderApp()
}

// Wire callbacks — all vars are module-level lets, forward refs are fine since
// callbacks are only called after full initialization.
appProps.onControlChange = (key, value) => {
  blockControls = { ...blockControls, [key]: value }
  if (key === 'backdropIntensity' && value > 0) lastBackdropIntensity = value
  sketch.setBlockControls(blockControls)
  saveStoredBlockControls(blockControls)
}

appProps.onFilterGroupStateChange = (key, enabled, solo) => {
  applyFilterGroupState({
    ...filterGroupState,
    [key]: { enabled, solo },
  })
}

appProps.onFilterOrderChange = applyFilterOrder

appProps.onVideoRhythmChange = applyVideoRhythmControls

appProps.onAudioSourceChange = async (mode) => {
  try {
    sketch.setAudioSourceMode(mode)
    saveStoredAudioSourceMode(mode)
    if (mode === 'input') await refreshAudioInputDevices()
    appProps = { ...appProps, audioSourceMode: mode }
    syncUi()
  } catch (error) {
    appProps = { ...appProps, status: error instanceof Error ? error.message : 'Audio source change failed.' }
    rerenderApp()
  }
}

appProps.onAudioDeviceConnect = async (deviceId) => {
  appProps = { ...appProps, status: 'Connecting audio input...' }
  rerenderApp()
  try {
    await sketch.loadAudioInput(deviceId || undefined)
    saveStoredAudioSourceMode('input')
    await refreshAudioInputDevices()
    const device = currentAudioDevices.find((d) => d.id === deviceId)
    appProps = {
      ...appProps,
      audioSourceMode: 'input',
      audioInputName: device?.label ?? 'Default input',
    }
    syncUi()
  } catch (error) {
    appProps = { ...appProps, status: error instanceof Error ? error.message : 'Audio input connection failed.' }
    rerenderApp()
  }
}

appProps.onImageFileChange = async (file) => {
  appProps = { ...appProps, status: 'Loading image...' }
  rerenderApp()
  try {
    await sketch.loadVisualMedia(file)
    await saveStoredMedia('image', file)
    appProps = { ...appProps, imageFileName: file.name }
    syncUi()
  } catch (error) {
    appProps = { ...appProps, status: error instanceof Error ? error.message : 'Visual media loading failed.' }
    rerenderApp()
  }
}

appProps.onAudioFileChange = async (file) => {
  appProps = { ...appProps, status: 'Loading WAV...' }
  rerenderApp()
  try {
    await sketch.loadAudio(file)
    await saveStoredMedia('audio', file)
    appProps = { ...appProps, audioFileName: file.name, audioSourceMode: 'wav' }
    syncUi()
  } catch (error) {
    appProps = { ...appProps, status: error instanceof Error ? error.message : 'Audio loading failed.' }
    rerenderApp()
  }
}

appProps.onPlayClick = async () => {
  try {
    await sketch.togglePlayback()
    syncUi()
  } catch (error) {
    appProps = { ...appProps, status: error instanceof Error ? error.message : 'Playback failed.' }
    rerenderApp()
  }
}

appProps.onRecordClick = async () => {
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
    setStatusOverride(error instanceof Error ? error.message : 'Video recording failed.', 4500)
  }
}

appProps.onRenderClick = async () => {
  try {
    setStatusOverride('Rendering video for download...', 5000)
    await sketch.renderVideoRecording()
    syncUi()
  } catch (error) {
    setStatusOverride(error instanceof Error ? error.message : 'Video render failed.', 4500)
  }
}

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

const animateUi = () => {
  syncUi()
  requestAnimationFrame(animateUi)
}

const restoreStoredMedia = async () => {
  appProps = { ...appProps, status: 'Loading demo media...' }
  rerenderApp()
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
    await sketch.loadAudio(audioFile)

    sketch.setAudioSourceMode(storedAudioSourceMode)

    appProps = {
      ...appProps,
      imageFileName: storedImage ? visualFile.name : `Demo: ${visualFile.name}`,
      audioFileName: storedAudio ? audioFile.name : `Demo: ${audioFile.name}`,
      audioSourceMode: storedAudioSourceMode,
    }
  } catch (error) {
    appProps = {
      ...appProps,
      status: error instanceof Error ? error.message : 'Default media could not be loaded.',
    }
  }

  syncUi()
}

applyBlockControls(loadStoredBlockControls() ?? DEFAULT_BLOCK_CONTROLS)
applyFilterOrder(loadStoredFilterOrder() ?? DEFAULT_FILTER_ORDER)
applyFilterGroupState(loadStoredFilterGroupState() ?? DEFAULT_FILTER_GROUP_STATE)
applyVideoRhythmControls(
  loadStoredVideoRhythmControls() ?? DEFAULT_VIDEO_RHYTHM_CONTROLS,
)
void refreshAudioInputDevices()
syncUi()
void restoreStoredMedia()
animateUi()

navigator.mediaDevices?.addEventListener('devicechange', () => {
  void refreshAudioInputDevices()
})

window.addEventListener('beforeunload', () => {
  sketch.dispose()
})
