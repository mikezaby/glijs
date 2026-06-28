import type p5 from 'p5'
import {
  createAudioInputConstraints,
  getAudioMonitorGain,
  type AudioSourceMode,
} from './audioSource'
import {
  DEFAULT_FILTER_GROUP_STATE,
  DEFAULT_FILTER_ORDER,
  normalizeFilterOrder,
  resolveActiveFilterOrder,
  type FilterGroupKey,
  type FilterGroupState,
} from './filterState'
import {
  getDrawableVisualVideoIndex,
  getVisualMediaKind,
  isVisualVideoDrawable,
  type VisualMediaKind,
} from './visualMedia'
import {
  DEFAULT_VIDEO_RHYTHM_CONTROLS,
  getVideoRhythmEnergy,
  getVideoRhythmIdleMergeStep,
  getVideoRhythmPieceOverscan,
  getVideoRhythmSeekSourceCount,
  getVideoRhythmSeekTime,
  normalizeVideoRhythmControls,
  shouldResumeVideoSlice,
  shouldTriggerVideoRhythmSeek,
  type VideoRhythmControls,
} from './videoRhythm'

export {
  DEFAULT_FILTER_GROUP_STATE,
  DEFAULT_FILTER_ORDER,
  type FilterGroupKey,
  type FilterGroupState,
} from './filterState'

export type GlitchMetrics = {
  level: number
  bass: number
  treble: number
  chaos: number
}

export type BlockControls = {
  spread: number
  density: number
  size: number
  noise: number
  randomness: number
  tearCount: number
  tearHeight: number
  tearShift: number
  rgbAmount: number
  rgbOpacity: number
  rgbBalance: number
  rgbDrift: number
  rgbSaturation: number
  rgbAudioTint: number
  scanlineDensity: number
  scanlineOpacity: number
  streakCount: number
  streakLength: number
  streakOpacity: number
  backdropIntensity: number
}

type Snapshot = {
  audioSourceMode: AudioSourceMode
  hasVisualMedia: boolean
  hasAudio: boolean
  playing: boolean
  recording: boolean
  rendering: boolean
  currentTime: number
  duration: number
}

type CreateGlitchSketchOptions = {
  host: HTMLElement
  onMetrics?: (metrics: GlitchMetrics) => void
  onRecordingComplete?: (recording: Blob) => void
}

type CoverBounds = {
  width: number
  height: number
}

type AudioData = {
  frequencies: Uint8Array<ArrayBuffer> | null
  waveform: Uint8Array<ArrayBuffer> | null
}

type VisualSource = {
  kind: VisualMediaKind
  element: p5.Image | HTMLVideoElement
  sliceElements?: HTMLVideoElement[]
  width: number
  height: number
}

const EMPTY_METRICS: GlitchMetrics = {
  level: 0,
  bass: 0,
  treble: 0,
  chaos: 0,
}

// Prefer MP4/H.264 so exports play everywhere without conversion; fall back to
// WebM on browsers whose MediaRecorder can't mux MP4 (older Chrome/Firefox).
const VIDEO_MIME_TYPES = [
  'video/mp4;codecs=avc1.640028,mp4a.40.2',
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=h264,opus',
  'video/webm',
]
const VIDEO_RHYTHM_SOURCE_COUNT = 8

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

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '00:00'
  }

  const minutes = Math.floor(seconds / 60)
  const remainder = Math.floor(seconds % 60)

  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(
    2,
    '0',
  )}`
}

export async function createGlitchSketch(options: CreateGlitchSketchOptions) {
  const audio = new Audio()
  audio.preload = 'metadata'

  let audioSourceMode: AudioSourceMode = 'wav'
  let audioContext: AudioContext | null = null
  let fileSourceNode: MediaElementAudioSourceNode | null = null
  let fileSourceConnected = false
  let inputStream: MediaStream | null = null
  let inputSourceNode: MediaStreamAudioSourceNode | null = null
  let inputSourceConnected = false
  let monitorGainNode: GainNode | null = null
  let liveInputPlaying = false
  let liveInputStartedAt = 0
  let liveInputElapsed = 0
  let analyser: AnalyserNode | null = null
  let frequencyData: Uint8Array<ArrayBuffer> | null = null
  let waveformData: Uint8Array<ArrayBuffer> | null = null
  let visualFileUrl: string | null = null
  let audioFileUrl: string | null = null
  let loadedVisualSource: VisualSource | null = null
  let canvasElement: HTMLCanvasElement | null = null
  let metrics: GlitchMetrics = { ...EMPTY_METRICS }
  let sketchInstance: p5 | null = null
  let blockControls: BlockControls = { ...DEFAULT_BLOCK_CONTROLS }
  let filterOrder: FilterGroupKey[] = [...DEFAULT_FILTER_ORDER]
  let filterGroupState: FilterGroupState = { ...DEFAULT_FILTER_GROUP_STATE }
  let videoRhythmControls: VideoRhythmControls = {
    ...DEFAULT_VIDEO_RHYTHM_CONTROLS,
  }
  let previousVideoRhythmEnergy = 0
  let lastVideoRhythmSeekAt = 0
  let lastVideoRhythmMultiSeekAt = 0
  let lastVideoRhythmMergeStep = 0
  let recorderDestination: MediaStreamAudioDestinationNode | null = null
  let recorderDestinationConnected = false
  let mediaRecorder: MediaRecorder | null = null
  let renderingVideo = false
  let recordingStream: MediaStream | null = null
  let recordingChunks: Blob[] = []
  let stopRecordingPromise: Promise<void> | null = null
  let resolveStopRecording: (() => void) | null = null
  let rejectStopRecording: ((error: Error) => void) | null = null
  let handleRecordingAudioEnded: (() => void) | null = null

  const sketch = (instance: p5) => {
    sketchInstance = instance

    instance.setup = () => {
      const canvas = instance.createCanvas(
        options.host.clientWidth,
        options.host.clientHeight,
      )
      canvas.parent(options.host)
      canvasElement = canvas.elt as HTMLCanvasElement
      instance.pixelDensity(1)
      instance.noStroke()
      instance.noiseDetail(3, 0.45)
    }

    instance.draw = () => {
      resizeIfNeeded(instance, options.host, mediaRecorder?.state === 'recording')
      metrics = readMetrics()
      const audioTime = getAudioTime()

      instance.background('#07111f')
      drawBackdrop(instance, metrics, blockControls)

      if (loadedVisualSource && isVisualSourceDrawable(loadedVisualSource)) {
        updateVideoRhythm(metrics, audioTime, Date.now())
        drawImageLayers(
          instance,
          loadedVisualSource,
          metrics,
          audioTime,
          videoRhythmControls,
          blockControls,
          resolveActiveFilterOrder(filterOrder, filterGroupState),
          {
            frequencies: frequencyData,
            waveform: waveformData,
          },
        )
      } else {
        drawPlaceholder(instance, metrics)
      }

      drawFinalShade(instance)
      options.onMetrics?.(metrics)
    }
  }

  const { default: P5 } = await import('p5')
  new P5(sketch)

  const ensureAudioGraph = () => {
    if (!audioContext) {
      audioContext = new AudioContext()
    }

    if (!analyser) {
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.82
      frequencyData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount))
      waveformData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount))
      monitorGainNode = audioContext.createGain()
      monitorGainNode.gain.value = getAudioMonitorGain(audioSourceMode)
      analyser.connect(monitorGainNode)
      monitorGainNode.connect(audioContext.destination)
    }
  }

  const updateAudioMonitorGain = () => {
    if (!audioContext || !monitorGainNode) {
      return
    }

    monitorGainNode.gain.setValueAtTime(
      getAudioMonitorGain(audioSourceMode),
      audioContext.currentTime,
    )
  }

  const connectFileSource = () => {
    ensureAudioGraph()

    if (!audioContext || !analyser) {
      throw new Error('Audio graph is unavailable.')
    }

    if (!fileSourceNode) {
      fileSourceNode = audioContext.createMediaElementSource(audio)
    }

    if (!fileSourceConnected) {
      fileSourceNode.connect(analyser)
      fileSourceConnected = true
    }
  }

  const disconnectFileSource = () => {
    if (!fileSourceNode || !fileSourceConnected) {
      return
    }

    fileSourceNode.disconnect()
    fileSourceConnected = false
  }

  const connectInputSource = () => {
    ensureAudioGraph()

    if (!inputSourceNode || !analyser) {
      throw new Error('Audio input is unavailable.')
    }

    if (!inputSourceConnected) {
      inputSourceNode.connect(analyser)
      inputSourceConnected = true
    }
  }

  const disconnectInputSource = () => {
    if (!inputSourceNode || !inputSourceConnected) {
      return
    }

    inputSourceNode.disconnect()
    inputSourceConnected = false
  }

  const stopInputStream = () => {
    disconnectInputSource()
    inputStream?.getTracks().forEach((track) => {
      track.stop()
    })
    inputStream = null
    inputSourceNode = null
    liveInputPlaying = false
    liveInputStartedAt = 0
    liveInputElapsed = 0
  }

  const getAudioTime = () => {
    if (audioSourceMode !== 'input') {
      return audio.currentTime
    }

    if (!liveInputPlaying || !audioContext) {
      return liveInputElapsed
    }

    return liveInputElapsed + Math.max(0, audioContext.currentTime - liveInputStartedAt)
  }

  const hasAudioSource = () => {
    return audioSourceMode === 'input' ? Boolean(inputStream) : Boolean(audio.src)
  }

  const isAudioSourcePlaying = () => {
    return audioSourceMode === 'input'
      ? liveInputPlaying
      : !audio.paused && !audio.ended
  }

  const pauseLiveInput = () => {
    if (!liveInputPlaying) {
      return
    }

    liveInputElapsed = getAudioTime()
    liveInputPlaying = false
    liveInputStartedAt = 0
    disconnectInputSource()
  }

  const playLiveInput = async () => {
    if (!inputStream) {
      throw new Error('Connect an audio input before pressing play.')
    }

    ensureAudioGraph()

    if (!audioContext) {
      throw new Error('Audio context is unavailable.')
    }

    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    connectInputSource()
    liveInputStartedAt = audioContext.currentTime
    liveInputPlaying = true
  }

  const readMetrics = (): GlitchMetrics => {
    if (!analyser || !frequencyData || !waveformData) {
      return EMPTY_METRICS
    }

    analyser.getByteFrequencyData(frequencyData)
    analyser.getByteTimeDomainData(waveformData)

    const level = computeWaveLevel(waveformData)
    const bass = averageRange(frequencyData, 0, 14) / 255
    const treble = averageRange(frequencyData, 50, 140) / 255
    const chaos = Math.min(1, level * 1.8 + bass * 0.9 + treble * 0.4)

    return { level, bass, treble, chaos }
  }

  const loadVisualMedia = async (file: File) => {
    if (!sketchInstance) {
      throw new Error('p5 sketch is not ready yet.')
    }

    const kind = getVisualMediaKind(file)

    if (!kind) {
      throw new Error('Select an image or video file.')
    }

    const nextUrl = URL.createObjectURL(file)

    try {
      const instance = sketchInstance
      const source =
        kind === 'image'
          ? await loadImageSource(instance, nextUrl)
          : await loadVideoSource(nextUrl)

      stopVisualVideo()
      loadedVisualSource = source
      if (visualFileUrl) {
        URL.revokeObjectURL(visualFileUrl)
      }
      visualFileUrl = nextUrl
    } catch (error) {
      URL.revokeObjectURL(nextUrl)
      throw error
    }
  }

  const loadAudio = async (file: File) => {
    if (mediaRecorder?.state === 'recording') {
      throw new Error('Stop recording before changing audio source.')
    }

    audioSourceMode = 'wav'
    updateAudioMonitorGain()
    pauseVisualVideo()
    stopInputStream()
    connectFileSource()

    const nextUrl = URL.createObjectURL(file)

    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        audio.removeEventListener('loadedmetadata', handleLoaded)
        audio.removeEventListener('error', handleError)
      }

      const handleLoaded = () => {
        cleanup()
        resolve()
      }

      const handleError = () => {
        cleanup()
        reject(new Error('The selected WAV could not be decoded.'))
      }

      audio.pause()
      audio.currentTime = 0
      audio.src = nextUrl
      audio.addEventListener('loadedmetadata', handleLoaded, { once: true })
      audio.addEventListener('error', handleError, { once: true })
      audio.load()
    })

    if (audioFileUrl) {
      URL.revokeObjectURL(audioFileUrl)
    }
    audioFileUrl = nextUrl
    metrics = { ...EMPTY_METRICS }
  }

  const loadAudioInput = async (deviceId?: string) => {
    if (mediaRecorder?.state === 'recording') {
      throw new Error('Stop recording before changing audio source.')
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Audio input is not supported in this browser.')
    }

    ensureAudioGraph()

    if (!audioContext) {
      throw new Error('Audio context is unavailable.')
    }

    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    const stream = await navigator.mediaDevices.getUserMedia(
      createAudioInputConstraints(deviceId),
    )

    audio.pause()
    disconnectFileSource()
    stopInputStream()

    audioSourceMode = 'input'
    updateAudioMonitorGain()
    inputStream = stream
    inputSourceNode = audioContext.createMediaStreamSource(stream)
    liveInputElapsed = 0
    connectInputSource()
    liveInputStartedAt = audioContext.currentTime
    liveInputPlaying = true
    metrics = { ...EMPTY_METRICS }

    await playVisualVideoFromAudio()
  }

  const setAudioSourceMode = (mode: AudioSourceMode) => {
    if (mediaRecorder?.state === 'recording') {
      throw new Error('Stop recording before changing audio source.')
    }

    if (mode === audioSourceMode) {
      return
    }

    pauseVisualVideo()

    if (mode === 'wav') {
      pauseLiveInput()
      stopInputStream()
      audioSourceMode = 'wav'
      updateAudioMonitorGain()

      if (audio.src) {
        connectFileSource()
      }
      return
    }

    audio.pause()
    disconnectFileSource()
    audioSourceMode = 'input'
    updateAudioMonitorGain()
    metrics = { ...EMPTY_METRICS }
  }

  const getVisualVideo = () => {
    return loadedVisualSource?.kind === 'video'
      ? (loadedVisualSource.element as HTMLVideoElement)
      : null
  }

  const syncVisualVideoToAudio = () => {
    const video = getVisualVideo()

    if (!video) {
      return
    }

    try {
      video.currentTime =
        Number.isFinite(video.duration) && video.duration > 0
          ? getAudioTime() % video.duration
          : 0
    } catch {
      // Some browsers reject seeks before the first decodable frame is ready.
    }
  }

  const playVisualVideoFromAudio = async () => {
    const video = getVisualVideo()

    if (!video) {
      return
    }

    syncVisualVideoToAudio()
    video.muted = true

    if (videoRhythmControls.mode === 'multi') {
      await playVideoSlices()
      return
    }

    await video.play()
  }

  const pauseVisualVideo = () => {
    getVisualVideo()?.pause()
    pauseVideoSlices()
  }

  const stopVisualVideo = () => {
    const video = getVisualVideo()

    if (!video) {
      return
    }

    video.pause()
    pauseVideoSlices()

    try {
      video.currentTime = 0
      for (const slice of loadedVisualSource?.sliceElements ?? []) {
        slice.currentTime = 0
      }
    } catch {
      // Ignore reset failures while the browser is still loading metadata.
    }
  }

  const playVideoSlices = async () => {
    const neededSlices = getNeededVideoSliceCount(videoRhythmControls)

    await Promise.all(
      (loadedVisualSource?.sliceElements ?? [])
        .slice(0, neededSlices)
        .filter(shouldResumeVideoSlice)
        .map((slice) => {
          slice.muted = true
          return slice.play()
        }),
    )
  }

  const pauseVideoSlices = () => {
    for (const slice of loadedVisualSource?.sliceElements ?? []) {
      slice.pause()
    }
  }

  const updateVideoRhythm = (
    nextMetrics: GlitchMetrics,
    audioTime: number,
    now: number,
  ) => {
    const video = getVisualVideo()

    if (!video || !isAudioSourcePlaying() || videoRhythmControls.mode === 'normal') {
      previousVideoRhythmEnergy = getVideoRhythmEnergy(
        nextMetrics,
        videoRhythmControls,
      )
      return
    }

    const shouldSeek = shouldTriggerVideoRhythmSeek({
      controls: videoRhythmControls,
      metrics: nextMetrics,
      previousEnergy: previousVideoRhythmEnergy,
      lastSeekAt: lastVideoRhythmSeekAt,
      now,
    })

    previousVideoRhythmEnergy = getVideoRhythmEnergy(
      nextMetrics,
      videoRhythmControls,
    )

    if (!shouldSeek || !Number.isFinite(video.duration) || video.duration <= 0) {
      updateVideoRhythmIdleMerge(now)
      return
    }

    lastVideoRhythmSeekAt = now

    if (videoRhythmControls.mode === 'seek') {
      video.currentTime = getVideoRhythmSeekTime({
        audioTime,
        duration: video.duration,
        seekRange: videoRhythmControls.seekRange,
        random: Math.random,
      })
      return
    }

    const neededSlices = getVideoRhythmSeekSourceCount(videoRhythmControls)
    lastVideoRhythmMultiSeekAt = now
    lastVideoRhythmMergeStep = 0

    for (const [index, slice] of (
      loadedVisualSource?.sliceElements ?? []
    ).entries()) {
      if (index >= neededSlices) {
        slice.pause()
        continue
      }

      slice.currentTime = getVideoRhythmSeekTime({
        audioTime,
        duration: slice.duration || video.duration,
        seekRange: videoRhythmControls.seekRange,
        random: Math.random,
      })
    }

    void playVideoSlices()
  }

  const updateVideoRhythmIdleMerge = (now: number) => {
    if (videoRhythmControls.mode !== 'multi' || lastVideoRhythmMultiSeekAt <= 0) {
      return
    }

    const sources = (loadedVisualSource?.sliceElements ?? []).slice(
      0,
      getVideoRhythmSeekSourceCount(videoRhythmControls),
    )
    const nextMergeStep = getVideoRhythmIdleMergeStep({
      lastSeekAt: lastVideoRhythmMultiSeekAt,
      now,
      mergeDelay: videoRhythmControls.mergeDelay,
      sourceCount: sources.length,
    })
    let appliedMerge = false

    for (
      let step = lastVideoRhythmMergeStep + 1;
      step <= nextMergeStep;
      step += 1
    ) {
      const source = sources[step - 1]
      const target = sources[step]

      if (!source || !target) {
        continue
      }

      try {
        target.currentTime = source.currentTime
        appliedMerge = true
      } catch {
        // Browsers can reject seeks while a video source is not ready.
      }
    }

    lastVideoRhythmMergeStep = nextMergeStep

    if (appliedMerge) {
      void playVideoSlices()
    }
  }

  audio.addEventListener('ended', pauseVisualVideo)

  const togglePlayback = async () => {
    if (!hasAudioSource()) {
      throw new Error(
        audioSourceMode === 'input'
          ? 'Connect an audio input before pressing play.'
          : 'Load a WAV file before pressing play.',
      )
    }

    if (audioSourceMode === 'input') {
      if (liveInputPlaying) {
        pauseLiveInput()
        pauseVisualVideo()
        return
      }

      await playLiveInput()
      await playVisualVideoFromAudio()
      return
    }

    connectFileSource()

    if (!audioContext) {
      throw new Error('Audio context is unavailable.')
    }

    if (audio.paused) {
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }
      await audio.play()
      await playVisualVideoFromAudio()
      return
    }

    audio.pause()
    pauseVisualVideo()
  }

  const cleanupRecording = () => {
    if (handleRecordingAudioEnded) {
      audio.removeEventListener('ended', handleRecordingAudioEnded)
      handleRecordingAudioEnded = null
    }

    recordingStream?.getVideoTracks().forEach((track) => {
      track.stop()
    })
    recordingStream = null
    mediaRecorder = null
    recordingChunks = []
  }

  const startVideoRecording = async () => {
    if (!loadedVisualSource) {
      throw new Error('Load an image or video before recording.')
    }

    if (!hasAudioSource()) {
      throw new Error(
        audioSourceMode === 'input'
          ? 'Connect an audio input before recording.'
          : 'Load a WAV file before recording.',
      )
    }

    if (!canvasElement?.captureStream || typeof MediaRecorder === 'undefined') {
      throw new Error('Video recording is not supported in this browser.')
    }

    if (mediaRecorder?.state === 'recording') {
      return
    }

    if (audioSourceMode === 'wav') {
      connectFileSource()
    } else {
      connectInputSource()
    }

    if (!audioContext || !analyser) {
      throw new Error('Audio graph is unavailable.')
    }

    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    if (!recorderDestination) {
      recorderDestination = audioContext.createMediaStreamDestination()
    }

    if (!recorderDestinationConnected) {
      analyser.connect(recorderDestination)
      recorderDestinationConnected = true
    }

    // Size the canvas to fullscreen before capturing so the recording starts at
    // a stable resolution regardless of the settings panel state.
    if (sketchInstance) {
      resizeIfNeeded(sketchInstance, options.host, true)
    }

    const canvasStream = canvasElement.captureStream(60)
    const audioTracks = recorderDestination.stream.getAudioTracks()
    const stream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ])
    const mimeType = getSupportedVideoMimeType()
    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: 256_000,
      // High-entropy glitch/noise content compresses poorly; a generous bitrate
      // keeps the export close to the live view instead of blocky.
      videoBitsPerSecond: 16_000_000,
    })

    mediaRecorder = recorder
    recordingStream = stream
    recordingChunks = []
    stopRecordingPromise = new Promise<void>((resolve, reject) => {
      resolveStopRecording = resolve
      rejectStopRecording = reject
    })

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        recordingChunks.push(event.data)
      }
    })

    recorder.addEventListener('stop', () => {
      const recordingType = recorder.mimeType || mimeType || 'video/webm'
      const recording = new Blob(recordingChunks, { type: recordingType })

      cleanupRecording()
      options.onRecordingComplete?.(recording)
      resolveStopRecording?.()
      resolveStopRecording = null
      rejectStopRecording = null
      stopRecordingPromise = null
    })

    recorder.addEventListener('error', (event) => {
      const error = event.error ?? new Error('Video recording failed.')
      cleanupRecording()
      rejectStopRecording?.(error)
      resolveStopRecording = null
      rejectStopRecording = null
      stopRecordingPromise = null
    })

    recorder.start(250)

    if (audioSourceMode === 'wav') {
      handleRecordingAudioEnded = () => {
        void stopVideoRecording({ pauseAudio: false })
      }
      audio.addEventListener('ended', handleRecordingAudioEnded, { once: true })

      audio.pause()
      audio.currentTime = 0
      await audio.play()
    } else {
      liveInputElapsed = getAudioTime()
      liveInputStartedAt = audioContext.currentTime
      liveInputPlaying = true
    }

    await playVisualVideoFromAudio()
  }

  const renderVideoRecording = async () => {
    if (audioSourceMode === 'input') {
      throw new Error('Render & download uses WAV files. Record live input manually.')
    }

    if (renderingVideo || mediaRecorder?.state === 'recording') {
      return
    }

    renderingVideo = true

    try {
      await startVideoRecording()
      await stopRecordingPromise
    } finally {
      renderingVideo = false
    }
  }

  const stopVideoRecording = async (
    { pauseAudio }: { pauseAudio: boolean } = { pauseAudio: true },
  ) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      return
    }

    if (pauseAudio) {
      if (audioSourceMode === 'input') {
        pauseLiveInput()
      } else {
        audio.pause()
      }
      pauseVisualVideo()
    }

    mediaRecorder.stop()
    await stopRecordingPromise
  }

  const getSnapshot = (): Snapshot => ({
    audioSourceMode,
    hasVisualMedia: Boolean(loadedVisualSource),
    hasAudio: hasAudioSource(),
    playing: isAudioSourcePlaying(),
    recording: mediaRecorder?.state === 'recording',
    rendering: renderingVideo,
    currentTime: getAudioTime(),
    duration:
      audioSourceMode === 'wav' && Number.isFinite(audio.duration)
        ? audio.duration
        : 0,
  })

  const setBlockControls = (nextControls: BlockControls) => {
    blockControls = {
      spread: clamp(nextControls.spread, 0, 100),
      density: clamp(nextControls.density, 0, 100),
      size: clamp(nextControls.size, 0, 100),
      noise: clamp(nextControls.noise, 0, 100),
      randomness: clamp(nextControls.randomness, 0, 100),
      tearCount: clamp(nextControls.tearCount, 0, 100),
      tearHeight: clamp(nextControls.tearHeight, 0, 100),
      tearShift: clamp(nextControls.tearShift, 0, 100),
      rgbAmount: clamp(nextControls.rgbAmount, 0, 100),
      rgbOpacity: clamp(nextControls.rgbOpacity, 0, 100),
      rgbBalance: clamp(nextControls.rgbBalance, 0, 100),
      rgbDrift: clamp(nextControls.rgbDrift, 0, 100),
      rgbSaturation: clamp(nextControls.rgbSaturation, 0, 100),
      rgbAudioTint: clamp(nextControls.rgbAudioTint, 0, 100),
      scanlineDensity: clamp(nextControls.scanlineDensity, 0, 100),
      scanlineOpacity: clamp(nextControls.scanlineOpacity, 0, 100),
      streakCount: clamp(nextControls.streakCount, 0, 100),
      streakLength: clamp(nextControls.streakLength, 0, 100),
      streakOpacity: clamp(nextControls.streakOpacity, 0, 100),
      backdropIntensity: clamp(nextControls.backdropIntensity, 0, 100),
    }
  }

  const setFilterOrder = (nextOrder: FilterGroupKey[]) => {
    filterOrder = normalizeFilterOrder(nextOrder)
  }

  const setFilterGroupState = (nextState: FilterGroupState) => {
    filterGroupState = nextState
  }

  const setVideoRhythmControls = (nextControls: VideoRhythmControls) => {
    videoRhythmControls = normalizeVideoRhythmControls(nextControls)
  }

  const dispose = () => {
    void stopVideoRecording()
    audio.pause()
    stopInputStream()
    pauseVisualVideo()
    audio.src = ''

    if (visualFileUrl) {
      URL.revokeObjectURL(visualFileUrl)
    }
    if (audioFileUrl) {
      URL.revokeObjectURL(audioFileUrl)
    }

    fileSourceNode?.disconnect()
    analyser?.disconnect()
    monitorGainNode?.disconnect()
    recorderDestination?.disconnect()
    sketchInstance?.remove()
    void audioContext?.close()
  }

  return {
    loadVisualMedia,
    loadAudio,
    loadAudioInput,
    setAudioSourceMode,
    togglePlayback,
    startVideoRecording,
    stopVideoRecording,
    renderVideoRecording,
    getSnapshot,
    setBlockControls,
    setFilterOrder,
    setFilterGroupState,
    setVideoRhythmControls,
    dispose,
  }
}

const loadImageSource = (instance: p5, url: string) => {
  return new Promise<VisualSource>((resolve, reject) => {
    instance.loadImage(
      url,
      (image) => {
        resolve({
          kind: 'image',
          element: image,
          sliceElements: undefined,
          width: image.width,
          height: image.height,
        })
      },
      () => {
        reject(new Error('The selected image could not be decoded.'))
      },
    )
  })
}

const loadVideoSource = (url: string) => {
  return new Promise<VisualSource>((resolve, reject) => {
    const video = createDrawableVideo(url)

    const cleanup = () => {
      video.removeEventListener('loadeddata', handleLoaded)
      video.removeEventListener('error', handleError)
    }

    const handleLoaded = () => {
      cleanup()
      const sliceElements = Array.from({ length: VIDEO_RHYTHM_SOURCE_COUNT }, () => {
        const slice = createDrawableVideo(url)
        slice.load()
        return slice
      })

      resolve({
        kind: 'video',
        element: video,
        sliceElements,
        width: video.videoWidth,
        height: video.videoHeight,
      })
    }

    const handleError = () => {
      cleanup()
      reject(new Error('The selected video could not be decoded.'))
    }

    video.addEventListener('loadeddata', handleLoaded, { once: true })
    video.addEventListener('error', handleError, { once: true })
    video.load()
  })
}

const createDrawableVideo = (url: string) => {
  const video = document.createElement('video')

  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.loop = true
  video.src = url

  return video
}

const isVisualSourceDrawable = (visualSource: VisualSource) => {
  if (visualSource.kind === 'image') {
    return visualSource.width > 0 && visualSource.height > 0
  }

  return isVisualVideoDrawable(visualSource.element as HTMLVideoElement)
}

const getNeededVideoSliceCount = (controls: VideoRhythmControls) => {
  if (controls.mode !== 'multi') {
    return 0
  }

  return Math.min(
    VIDEO_RHYTHM_SOURCE_COUNT,
    Math.max(1, Math.round(controls.slices)),
  )
}

const getSupportedVideoMimeType = () => {
  if (typeof MediaRecorder === 'undefined') {
    return ''
  }

  return (
    VIDEO_MIME_TYPES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ??
    ''
  )
}

const resizeIfNeeded = (instance: p5, host: HTMLElement, recording = false) => {
  // ponytail: while recording, pin to the full window so toggling the settings
  // panel (which shrinks the host) can't change the output video resolution.
  const nextWidth = optionsSafeDimension(recording ? window.innerWidth : host.clientWidth)
  const nextHeight = optionsSafeDimension(recording ? window.innerHeight : host.clientHeight)

  if (instance.width !== nextWidth || instance.height !== nextHeight) {
    instance.resizeCanvas(nextWidth, nextHeight)
  }
}

const drawBackdrop = (
  instance: p5,
  metrics: GlitchMetrics,
  blockControls: BlockControls,
) => {
  const intensity = blockControls.backdropIntensity / 100

  if (intensity <= 0) {
    return
  }

  const pulse = (0.12 + metrics.level * 0.28) * intensity

  for (let index = 0; index < 7; index += 1) {
    const y = (index / 6) * instance.height
    const alpha = (14 + index * 6 + metrics.treble * 18) * intensity
    instance.fill(14, 48 + index * 10, 74 + pulse * 100, alpha)
    instance.rect(0, y, instance.width, instance.height / 8)
  }

  instance.push()
  instance.blendMode(instance.ADD)
  instance.fill(255, 110, 62, (30 + metrics.bass * 55) * intensity)
  instance.circle(
    instance.width * 0.18,
    instance.height * 0.2,
    (220 + metrics.bass * 180) * mix(0.35, 1, intensity),
  )
  instance.fill(72, 188, 255, (28 + metrics.treble * 60) * intensity)
  instance.circle(
    instance.width * 0.86,
    instance.height * 0.72,
    (260 + metrics.chaos * 220) * mix(0.35, 1, intensity),
  )
  instance.pop()
}

const drawPlaceholder = (instance: p5, metrics: GlitchMetrics) => {
  instance.push()
  instance.stroke(144, 199, 255, 90)
  instance.noFill()
  instance.rect(34, 34, instance.width - 68, instance.height - 68, 28)
  instance.noStroke()
  instance.fill(240, 245, 255, 220)
  instance.textAlign(instance.CENTER, instance.CENTER)
  instance.textSize(Math.max(20, instance.width * 0.026))
  instance.text('Upload an image to become the glitch target.', instance.width / 2, instance.height / 2)
  instance.fill(255, 144, 72, 28 + metrics.chaos * 80)
  for (let index = 0; index < 14; index += 1) {
    const barY = (index / 14) * instance.height
    const barHeight = 6 + instance.noise(index, instance.frameCount * 0.02) * 14
    instance.rect(0, barY, instance.width * (0.35 + metrics.level * 0.5), barHeight)
  }
  instance.pop()
}

const drawImageLayers = (
  instance: p5,
  visualSource: VisualSource,
  metrics: GlitchMetrics,
  audioTime: number,
  videoRhythmControls: VideoRhythmControls,
  blockControls: BlockControls,
  filterOrder: FilterGroupKey[],
  audioData: AudioData,
) => {
  const bounds = getCoverBounds(
    visualSource.width,
    visualSource.height,
    instance.width * 0.84,
    instance.height * 0.8,
  )
  const centerX = instance.width / 2 + Math.sin(audioTime * 1.7) * metrics.bass * 14
  const centerY = instance.height / 2 + Math.cos(audioTime * 2.2) * metrics.level * 10
  const x = centerX - bounds.width / 2
  const y = centerY - bounds.height / 2

  instance.push()
  instance.blendMode(instance.BLEND)
  drawVisualSource(
    instance,
    visualSource,
    videoRhythmControls,
    x,
    y,
    bounds.width,
    bounds.height,
  )
  instance.pop()

  for (const group of filterOrder) {
    const source = instance.get()

    switch (group) {
      case 'rgbSplit':
        drawRgbSplit(instance, source, metrics, audioTime, blockControls, audioData)
        break
      case 'tears':
        drawTears(instance, source, metrics, audioTime, blockControls)
        break
      case 'squares':
        drawSquares(instance, source, metrics, audioTime, blockControls, audioData)
        break
      case 'scanlines':
        drawScanlines(instance, metrics, blockControls)
        break
      case 'streaks':
        drawStreaks(instance, metrics, blockControls)
        break
    }
  }
}

const drawVisualSource = (
  instance: p5,
  visualSource: VisualSource,
  videoRhythmControls: VideoRhythmControls,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  if (visualSource.kind === 'image') {
    instance.tint(255, 244)
    instance.image(visualSource.element as p5.Image, x, y, width, height)
    return
  }

  const context = instance.drawingContext as CanvasRenderingContext2D

  context.save()
  context.globalAlpha = 244 / 255
  if (videoRhythmControls.mode === 'multi' && visualSource.sliceElements?.length) {
    drawVideoSlices(
      context,
      visualSource,
      videoRhythmControls,
      x,
      y,
      width,
      height,
      instance.frameCount,
    )
  } else {
    context.drawImage(visualSource.element as HTMLVideoElement, x, y, width, height)
  }
  context.restore()
}

const drawVideoSlices = (
  context: CanvasRenderingContext2D,
  visualSource: VisualSource,
  videoRhythmControls: VideoRhythmControls,
  x: number,
  y: number,
  width: number,
  height: number,
  frameCount: number,
) => {
  const sources = visualSource.sliceElements ?? []
  const sliceCount = Math.max(1, Math.round(videoRhythmControls.slices))

  if (videoRhythmControls.shape === 'cubes') {
    drawVideoCubes(
      context,
      visualSource,
      sources,
      videoRhythmControls,
      x,
      y,
      width,
      height,
      frameCount,
      sliceCount,
    )
    return
  }

  const sourceHeight = visualSource.height / sliceCount
  const targetHeight = height / sliceCount
  const motion = (videoRhythmControls.motion / 100) * 28
  const overlap = getVideoRhythmPieceOverscan(motion)

  for (let index = 0; index < sliceCount; index += 1) {
    const source = getVideoPieceSource(
      sources,
      index,
      visualSource.element as HTMLVideoElement,
    )
    const drift = getVideoPieceDrift(index, frameCount, motion)

    context.drawImage(
      source,
      0,
      index * sourceHeight,
      visualSource.width,
      sourceHeight,
      x + drift.x - overlap,
      y + index * targetHeight + drift.y - overlap,
      width + overlap * 2,
      targetHeight + overlap * 2 + 1,
    )
  }
}

const getVideoPieceSource = (
  sources: HTMLVideoElement[],
  index: number,
  primary: HTMLVideoElement,
) => {
  if (sources.length === 0) {
    return primary
  }

  const sourceIndex = getDrawableVisualVideoIndex(sources, index % sources.length)

  return sourceIndex >= 0 ? sources[sourceIndex] : sources[index % sources.length]
}

const drawVideoCubes = (
  context: CanvasRenderingContext2D,
  visualSource: VisualSource,
  sources: HTMLVideoElement[],
  videoRhythmControls: VideoRhythmControls,
  x: number,
  y: number,
  width: number,
  height: number,
  frameCount: number,
  pieceCount: number,
) => {
  const columns = Math.ceil(Math.sqrt(pieceCount))
  const rows = Math.ceil(pieceCount / columns)
  const sourceCellWidth = visualSource.width / columns
  const sourceCellHeight = visualSource.height / rows
  const targetCellWidth = width / columns
  const targetCellHeight = height / rows
  const motion = (videoRhythmControls.motion / 100) * 34
  const overlap = getVideoRhythmPieceOverscan(motion)

  for (let index = 0; index < pieceCount; index += 1) {
    const column = index % columns
    const row = Math.floor(index / columns)
    const source = getVideoPieceSource(
      sources,
      index,
      visualSource.element as HTMLVideoElement,
    )
    const drift = getVideoPieceDrift(index, frameCount, motion)

    context.drawImage(
      source,
      column * sourceCellWidth,
      row * sourceCellHeight,
      sourceCellWidth,
      sourceCellHeight,
      x + column * targetCellWidth + drift.x - overlap,
      y + row * targetCellHeight + drift.y - overlap,
      targetCellWidth + overlap * 2 + 1,
      targetCellHeight + overlap * 2 + 1,
    )
  }
}

const getVideoPieceDrift = (
  index: number,
  frameCount: number,
  motion: number,
) => {
  if (motion <= 0) {
    return { x: 0, y: 0 }
  }

  const time = frameCount * 0.045

  return {
    x: Math.sin(time + index * 12.9898) * motion,
    y: Math.cos(time * 1.17 + index * 78.233) * motion,
  }
}

const drawRgbSplit = (
  target: p5,
  source: p5.Image,
  metrics: GlitchMetrics,
  audioTime: number,
  blockControls: BlockControls,
  audioData: AudioData,
) => {
  const rgbAmount = blockControls.rgbAmount / 100
  const rgbOpacity = blockControls.rgbOpacity / 100
  const rgbBalance = blockControls.rgbBalance / 100
  const rgbDrift = blockControls.rgbDrift / 100
  const rgbSaturation = blockControls.rgbSaturation / 100
  const rgbAudioTint = blockControls.rgbAudioTint / 100

  if (rgbAmount <= 0 || rgbOpacity <= 0) {
    return
  }

  const rgbState = getRgbSplitState(audioData, metrics, audioTime)
  const balance = (rgbBalance - 0.5) * 2
  const drift =
    Math.sin(audioTime * (0.65 + rgbState.high * 2.6) + rgbState.angle * 1.7) *
    rgbDrift
  const bassCyanPush = rgbState.low * rgbAudioTint
  const highRedPush = rgbState.high * rgbAudioTint
  const midSpectralPush = rgbState.mid * rgbAudioTint
  const spectralContrast = (rgbState.high - rgbState.low) * rgbAudioTint
  const redPower = clamp(0.72 + balance * 0.62 + highRedPush * 1.35 - bassCyanPush * 0.38 + drift * 0.32, 0.16, 2.45)
  const cyanPower = clamp(0.72 - balance * 0.62 + bassCyanPush * 1.45 - highRedPush * 0.28 - drift * 0.24, 0.16, 2.45)
  const violetPower = clamp(0.58 + midSpectralPush * 0.9 + Math.abs(spectralContrast) * 0.55 + drift * 0.22, 0.12, 2.1)
  const saturation = mix(0.42, 1.65, rgbSaturation)
  const redTint = {
    r: clampColor(156 + 88 * redPower * saturation + 42 * highRedPush),
    g: clampColor(18 + 28 * (1 - balance) + 32 * midSpectralPush),
    b: clampColor(34 + 64 * violetPower * (1 - rgbSaturation * 0.35)),
  }
  const cyanTint = {
    r: clampColor(18 + 38 * redPower * (1 - rgbSaturation * 0.38) + 28 * midSpectralPush),
    g: clampColor(128 + 92 * cyanPower * saturation + 42 * bassCyanPush),
    b: clampColor(152 + 94 * cyanPower * saturation + 36 * bassCyanPush),
  }
  const blueTint = {
    r: clampColor(44 + 84 * violetPower + 46 * highRedPush),
    g: clampColor(62 + 78 * cyanPower * saturation + 42 * midSpectralPush),
    b: clampColor(142 + 88 * saturation + 62 * bassCyanPush + 32 * violetPower),
  }
  const channelOffset =
    (4 + metrics.treble * 38 + metrics.level * 22 + metrics.bass * 12) *
    rgbAmount *
    rgbState.pulse
  const splitX = Math.cos(rgbState.angle) * channelOffset
  const splitY = Math.sin(rgbState.angle) * channelOffset

  target.push()
  target.blendMode(target.ADD)
  target.tint(redTint.r, redTint.g, redTint.b, (62 + metrics.chaos * 120) * rgbOpacity * rgbState.opacity * redPower)
  target.image(source, -splitX, -splitY, target.width, target.height)
  target.tint(cyanTint.r, cyanTint.g, cyanTint.b, (34 + metrics.level * 90) * rgbOpacity * rgbState.opacity * cyanPower)
  target.image(
    source,
    splitY * 0.75,
    -splitX * 0.75,
    target.width,
    target.height,
  )
  target.tint(blueTint.r, blueTint.g, blueTint.b, (64 + metrics.treble * 145) * rgbOpacity * rgbState.opacity * violetPower)
  target.image(
    source,
    splitX * 1.1,
    splitY * 1.1 + metrics.level * 10,
    target.width,
    target.height,
  )
  target.pop()
}

const drawTears = (
  target: p5,
  source: p5.Image,
  metrics: GlitchMetrics,
  audioTime: number,
  blockControls: BlockControls,
) => {
  const tearCountControl = blockControls.tearCount / 100
  const tearHeightControl = blockControls.tearHeight / 100
  const tearShiftControl = blockControls.tearShift / 100
  const tearCount = Math.round((2 + metrics.bass * 12) * tearCountControl)

  for (let index = 0; index < tearCount; index += 1) {
    const seed = audioTime * 0.8 + index * 0.2
    const normalizedY = target.noise(seed, metrics.chaos * 5)
    const sliceSourceY = normalizedY * source.height * 0.92
    const sliceHeight = Math.max(
      1,
      source.height * mix(0.01, 0.12, tearHeightControl) * (0.65 + metrics.level),
    )
    const sliceDestY = normalizedY * target.height
    const shift =
      (target.noise(seed * 2.8, 2.4) - 0.5) *
      (40 + metrics.bass * 180) *
      tearShiftControl

    target.copy(
      source,
      0,
      sliceSourceY,
      source.width,
      sliceHeight,
      shift,
      sliceDestY,
      target.width,
      sliceHeight,
    )
  }
}

const drawSquares = (
  target: p5,
  source: p5.Image,
  metrics: GlitchMetrics,
  audioTime: number,
  blockControls: BlockControls,
  audioData: AudioData,
) => {
  const spread = blockControls.spread / 100
  const density = blockControls.density / 100
  const size = blockControls.size / 100
  const squareNoise = blockControls.noise / 100
  const randomness = blockControls.randomness / 100

  if (spread <= 0 || density <= 0) {
    return
  }

  const blockX = 0
  const blockY = 0
  const blockWidth = target.width
  const blockHeight = target.height
  const destSize = Math.min(blockWidth, blockHeight) * mix(0.04, 0.18, size)
  const targetCoverage = blockWidth * blockHeight * density
  const blockCount = Math.max(
    1,
    Math.ceil(targetCoverage / (destSize * destSize)),
  )
  const spreadRange = mix(0.08, 1, spread)
  const randomPhase = Math.floor(audioTime * mix(0.8, 12, randomness))
  const randomTravel = Math.min(blockWidth, blockHeight) * mix(0, 0.46, randomness)

  for (let index = 0; index < blockCount; index += 1) {
    const seed = index * 37.19 + randomPhase * 101.7
    const audioPosition = getAudioBlockPosition(index, blockCount, audioData)
    const randomAngle = hash01(seed, 13.2) * Math.PI * 2
    const randomDistance = hash01(seed, 41.8) * randomTravel
    const spreadU = 0.5 + (audioPosition.u - 0.5) * spreadRange
    const spreadV = 0.5 + (audioPosition.v - 0.5) * spreadRange
    const anchorX = blockX + spreadU * (blockWidth - destSize)
    const anchorY = blockY + spreadV * (blockHeight - destSize)
    const destX = clamp(
      anchorX + Math.cos(randomAngle) * randomDistance,
      blockX,
      blockX + blockWidth - destSize,
    )
    const destY = clamp(
      anchorY + Math.sin(randomAngle) * randomDistance,
      blockY,
      blockY + blockHeight - destSize,
    )
    const sourceSize = Math.min(source.width, source.height) * mix(0.9, 1.2, metrics.chaos) * (destSize / Math.min(blockWidth, blockHeight))
    const sourceAnchor = getLocalSourceRect({
      destX,
      destY,
      destSize,
      sourceSize,
      canvasWidth: blockWidth,
      canvasHeight: blockHeight,
      source,
      audioPosition,
      metrics,
      randomness,
    })

    target.push()
    target.tint(255, 180 + metrics.treble * 75)
    target.copy(
      source,
      sourceAnchor.x,
      sourceAnchor.y,
      sourceSize,
      sourceSize,
      destX,
      destY,
      destSize,
      destSize,
    )
    drawSquareNoise({
      target,
      source,
      sourceAnchor,
      sourceSize,
      x: destX,
      y: destY,
      size: destSize,
      amount: squareNoise,
      seed,
      metrics,
    })
    target.pop()
  }
}

const drawSquareNoise = ({
  target,
  source,
  sourceAnchor,
  sourceSize,
  x,
  y,
  size,
  amount,
  seed,
  metrics,
}: {
  target: p5
  source: p5.Image
  sourceAnchor: { x: number; y: number }
  sourceSize: number
  x: number
  y: number
  size: number
  amount: number
  seed: number
  metrics: GlitchMetrics
}) => {
  if (amount <= 0) {
    return
  }

  const grid = Math.round(mix(5, 18, amount))
  const cell = size / grid
  const signalEnergy = clamp(metrics.level * 0.9 + metrics.treble * 0.7 + metrics.bass * 0.35, 0, 1.4)
  const cubeCount = Math.round(mix(4, 72, amount) * (0.78 + signalEnergy * 0.6))
  const snowCount = Math.round((size * size * mix(0.003, 0.032, amount)) * (0.75 + metrics.treble * 0.75))
  const bandCount = Math.round(mix(1, 12, amount) * (0.8 + metrics.bass * 0.9))
  const sourceJitter = sourceSize * mix(0.05, 0.42, amount) * (0.8 + signalEnergy * 0.45)
  const speckleUnit = Math.max(1, size / mix(48, 18, amount))

  target.push()
  target.noStroke()

  if (amount > 0.06) {
    const washAlpha = mix(7, 34, amount) * (0.65 + metrics.level * 0.9)
    target.fill(225, 238, 196, washAlpha)
    target.rect(x, y, size, size)
  }

  for (let index = 0; index < cubeCount; index += 1) {
    const col = Math.floor(hash01(seed + index * 11.1, 7.2) * grid)
    const row = Math.floor(hash01(seed + index * 17.4, 9.8) * grid)
    const spanX = Math.max(1, Math.round(mix(1, 4, amount * hash01(seed + index, 13.5))))
    const spanY = Math.max(1, Math.round(mix(1, 3, amount * hash01(seed + index, 29.7))))
    const destWidth = Math.min(size - col * cell, cell * spanX)
    const destHeight = Math.min(size - row * cell, cell * spanY)
    const destX = x + col * cell
    const destY = y + row * cell
    const localU = (destX - x + destWidth * 0.5) / size
    const localV = (destY - y + destHeight * 0.5) / size
    const sampleWidth = sourceSize * (destWidth / size)
    const sampleHeight = sourceSize * (destHeight / size)
    const sourceX = clamp(
      sourceAnchor.x +
        localU * sourceSize -
        (destWidth / size) * sourceSize * 0.5 +
        (hash01(seed + index, 41.2) - 0.5) * sourceJitter,
      0,
      Math.max(0, source.width - sampleWidth),
    )
    const sourceY = clamp(
      sourceAnchor.y +
        localV * sourceSize -
        (destHeight / size) * sourceSize * 0.5 +
        (hash01(seed + index, 58.4) - 0.5) * sourceJitter,
      0,
      Math.max(0, source.height - sampleHeight),
    )

    target.copy(
      source,
      sourceX,
      sourceY,
      sampleWidth,
      sampleHeight,
      destX,
      destY,
      destWidth,
      destHeight,
    )

    if (hash01(seed + index, 91.2) > 0.46) {
      const alpha = mix(18, 82, amount) * hash01(seed + index, 72.5)
      const colorPick = hash01(seed + index, 109.6)
      if (colorPick < 0.36) {
        target.fill(244, 248, 214, alpha)
      } else if (colorPick < 0.64) {
        target.fill(92, 196, 160, alpha * 0.72)
      } else {
        target.fill(34, 55, 102, alpha * 0.68)
      }
      target.rect(destX, destY, destWidth, destHeight)
    }
  }

  for (let index = 0; index < snowCount; index += 1) {
    const dotSize = speckleUnit * mix(0.65, 2.4, hash01(seed + index, 31.8))
    const dotX = x + hash01(seed + index * 5.31, 12.7) * Math.max(0, size - dotSize)
    const dotY = y + hash01(seed + index * 8.17, 44.9) * Math.max(0, size - dotSize)
    const colorPick = hash01(seed + index, 101.4)
    const alpha = mix(24, 118, amount) * hash01(seed + index * 2.43, 72.5)

    if (colorPick < 0.34) {
      target.fill(246, 248, 226, alpha)
    } else if (colorPick < 0.58) {
      target.fill(13, 18, 28, alpha * 0.9)
    } else if (colorPick < 0.78) {
      target.fill(75, 204, 152, alpha * 0.68)
    } else {
      target.fill(118, 148, 218, alpha * 0.62)
    }
    target.rect(dotX, dotY, dotSize, dotSize)
  }

  for (let index = 0; index < bandCount; index += 1) {
    const dashY = y + hash01(seed + index * 19.1, 22.2) * size
    const dashX = x + hash01(seed + index * 13.7, 4.8) * size * 0.55
    const dashWidth = size * mix(0.28, 1.05, hash01(seed + index, 61.3))
    const dashHeight = Math.max(1, cell * mix(0.18, 0.72, amount))
    const alpha = mix(28, 112, amount) * hash01(seed + index, 33.6)

    target.fill(238, 246, 218, alpha)
    target.rect(dashX, dashY, Math.min(x + size - dashX, dashWidth), dashHeight)
  }

  target.pop()
}

const getRgbSplitState = (
  audioData: AudioData,
  metrics: GlitchMetrics,
  audioTime: number,
) => {
  const low = sampleAudioData(audioData.frequencies, fract(audioTime * 0.071))
  const mid = sampleAudioData(audioData.frequencies, fract(0.33 + audioTime * 0.113))
  const high = sampleAudioData(audioData.frequencies, fract(0.72 + audioTime * 0.167))
  const waveA = sampleAudioData(audioData.waveform, fract(audioTime * 0.191))
  const waveB = sampleAudioData(audioData.waveform, fract(0.57 + audioTime * 0.137))
  const audioFlux =
    Math.abs(high - low) * 0.95 +
    Math.abs(waveA - waveB) * 0.85 +
    metrics.level * 0.75 +
    metrics.treble * 0.55
  const angle =
    (waveA - 0.5) * Math.PI * 1.5 +
    (mid - 0.5) * Math.PI +
    Math.sin(audioTime * (3.5 + high * 8)) * 0.45

  return {
    angle,
    low,
    mid,
    high,
    pulse: clamp(0.35 + audioFlux * 1.85, 0.2, 2.8),
    opacity: clamp(0.55 + audioFlux * 1.15, 0.35, 1.85),
  }
}

const drawScanlines = (
  target: p5,
  metrics: GlitchMetrics,
  blockControls: BlockControls,
) => {
  const scanlineDensity = blockControls.scanlineDensity / 100
  const scanlineOpacity = blockControls.scanlineOpacity / 100

  if (scanlineDensity <= 0 || scanlineOpacity <= 0) {
    return
  }

  const scanlineGap = Math.round(mix(18, 3, scanlineDensity))
  target.push()
  for (let y = 0; y < target.height; y += scanlineGap) {
    const alpha = (15 + metrics.treble * 26 + (y % 12 === 0 ? 12 : 0)) * scanlineOpacity
    target.fill(255, 255, 255, alpha)
    target.rect(0, y, target.width, 1)
  }
  target.pop()
}

const drawStreaks = (
  target: p5,
  metrics: GlitchMetrics,
  blockControls: BlockControls,
) => {
  const streakCountControl = blockControls.streakCount / 100
  const streakLength = blockControls.streakLength / 100
  const streakOpacity = blockControls.streakOpacity / 100

  if (streakCountControl <= 0 || streakOpacity <= 0) {
    return
  }

  const streaks = Math.round((4 + metrics.chaos * 24) * streakCountControl)
  target.push()
  for (let index = 0; index < streaks; index += 1) {
    const noiseValue = target.noise(index * 0.8, target.frameCount * 0.02)
    const streakY = noiseValue * target.height
    const streakWidth = target.width * mix(0.06, 0.85, streakLength) * (0.55 + metrics.level)
    const streakX = (target.noise(index * 1.4, target.frameCount * 0.02 + 9) - 0.2) * target.width
    target.fill(255, 134, 92, (12 + metrics.bass * 45) * streakOpacity)
    target.rect(streakX, streakY, streakWidth, 2 + metrics.level * 3)
  }
  target.pop()
}

const drawFinalShade = (instance: p5) => {
  instance.push()
  instance.fill(8, 10, 18, 42)
  instance.rect(0, 0, instance.width, instance.height)
  instance.pop()
}

const computeWaveLevel = (samples: Uint8Array<ArrayBuffer>): number => {
  let total = 0

  for (const sample of samples) {
    const centered = (sample - 128) / 128
    total += centered * centered
  }

  return Math.min(1, Math.sqrt(total / samples.length) * 2.8)
}

const averageRange = (
  values: Uint8Array<ArrayBuffer>,
  start: number,
  end: number,
): number => {
  const safeEnd = Math.min(values.length, end)
  let total = 0
  let count = 0

  for (let index = start; index < safeEnd; index += 1) {
    total += values[index]
    count += 1
  }

  return count === 0 ? 0 : total / count
}

const mix = (start: number, end: number, amount: number) => {
  return start + (end - start) * amount
}

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value))
}

const clampColor = (value: number) => {
  return clamp(value, 0, 255)
}

const getAudioBlockPosition = (
  index: number,
  blockCount: number,
  audioData: AudioData,
) => {
  const laneU = fract(index * 0.61803398875 + hash01(index, 9.4) * 0.08)
  const laneV = hash01(index, 27.8)
  const frequencyValue = sampleAudioData(
    audioData.frequencies,
    fract(laneU + hash01(index, 63.1) * 0.2),
  )
  const waveformValue = sampleAudioData(
    audioData.waveform,
    fract(laneV + hash01(index, 91.7) * 0.2),
  )
  const crossValue = sampleAudioData(
    audioData.frequencies,
    fract((index + 0.5) / blockCount + waveformValue * 0.31),
  )
  const audioU = (frequencyValue - 0.5) * 0.42 + (crossValue - 0.5) * 0.18
  const audioV = (waveformValue - 0.5) * 0.42 + (frequencyValue - 0.5) * 0.18

  return {
    u: wrap01(laneU + audioU),
    v: wrap01(laneV + audioV),
    sourceU: frequencyValue,
    sourceV: waveformValue,
  }
}

const getLocalSourceRect = ({
  destX,
  destY,
  destSize,
  sourceSize,
  canvasWidth,
  canvasHeight,
  source,
  audioPosition,
  metrics,
  randomness,
}: {
  destX: number
  destY: number
  destSize: number
  sourceSize: number
  canvasWidth: number
  canvasHeight: number
  source: p5.Image
  audioPosition: ReturnType<typeof getAudioBlockPosition>
  metrics: GlitchMetrics
  randomness: number
}) => {
  const destCenterU = (destX + destSize / 2) / canvasWidth
  const destCenterV = (destY + destSize / 2) / canvasHeight
  const maxLocalOffset = mix(0.015, 0.12, metrics.chaos) * mix(0.45, 1, randomness)
  const localOffsetU = (audioPosition.sourceU - 0.5) * maxLocalOffset
  const localOffsetV = (audioPosition.sourceV - 0.5) * maxLocalOffset
  const sourceCenterX = (destCenterU + localOffsetU) * source.width
  const sourceCenterY = (destCenterV + localOffsetV) * source.height

  return {
    x: clamp(sourceCenterX - sourceSize / 2, 0, source.width - sourceSize),
    y: clamp(sourceCenterY - sourceSize / 2, 0, source.height - sourceSize),
  }
}

const sampleAudioData = (
  values: Uint8Array<ArrayBuffer> | null,
  normalizedIndex: number,
) => {
  if (!values || values.length === 0) {
    return normalizedIndex
  }

  const index = Math.min(values.length - 1, Math.floor(normalizedIndex * values.length))

  return values[index] / 255
}

const hash01 = (x: number, salt: number) => {
  return fract(Math.sin(x * 12.9898 + salt * 78.233) * 43758.5453)
}

const wrap01 = (value: number) => {
  return fract(value + 1)
}

const fract = (value: number) => {
  return value - Math.floor(value)
}

const getCoverBounds = (
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number,
): CoverBounds => {
  const scale = Math.max(maxWidth / sourceWidth, maxHeight / sourceHeight)
  const width = sourceWidth * scale
  const height = sourceHeight * scale

  return {
    width,
    height,
  }
}

const optionsSafeDimension = (value: number | undefined) => {
  if (!value || value < 120) {
    return 120
  }

  return value
}
