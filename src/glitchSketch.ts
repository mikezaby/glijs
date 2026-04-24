import type p5 from 'p5'

export type GlitchMetrics = {
  level: number
  bass: number
  treble: number
  chaos: number
}

export type BlockControls = {
  spread: number
  density: number
  randomness: number
}

type Snapshot = {
  hasImage: boolean
  hasAudio: boolean
  playing: boolean
  currentTime: number
  duration: number
}

type CreateGlitchSketchOptions = {
  host: HTMLElement
  onMetrics?: (metrics: GlitchMetrics) => void
}

type CoverBounds = {
  width: number
  height: number
}

const EMPTY_METRICS: GlitchMetrics = {
  level: 0,
  bass: 0,
  treble: 0,
  chaos: 0,
}

const DEFAULT_BLOCK_CONTROLS: BlockControls = {
  spread: 62,
  density: 58,
  randomness: 44,
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

  let audioContext: AudioContext | null = null
  let sourceNode: MediaElementAudioSourceNode | null = null
  let analyser: AnalyserNode | null = null
  let frequencyData: Uint8Array<ArrayBuffer> | null = null
  let waveformData: Uint8Array<ArrayBuffer> | null = null
  let imageFileUrl: string | null = null
  let audioFileUrl: string | null = null
  let loadedImage: p5.Image | null = null
  let metrics: GlitchMetrics = { ...EMPTY_METRICS }
  let sketchInstance: p5 | null = null
  let blockControls: BlockControls = { ...DEFAULT_BLOCK_CONTROLS }

  const sketch = (instance: p5) => {
    sketchInstance = instance

    instance.setup = () => {
      const canvas = instance.createCanvas(
        options.host.clientWidth,
        options.host.clientHeight,
      )
      canvas.parent(options.host)
      instance.pixelDensity(1)
      instance.noStroke()
      instance.noiseDetail(3, 0.45)
    }

    instance.draw = () => {
      resizeIfNeeded(instance, options.host)
      metrics = readMetrics()

      instance.background('#07111f')
      drawBackdrop(instance, metrics)

      if (loadedImage) {
        drawImageLayers(
          instance,
          loadedImage,
          metrics,
          audio.currentTime,
          blockControls,
        )
      } else {
        drawPlaceholder(instance, metrics)
      }

      drawOverlay(instance, metrics)
      options.onMetrics?.(metrics)
    }
  }

  const { default: P5 } = await import('p5')
  new P5(sketch)

  const ensureAudioGraph = () => {
    if (audioContext && analyser && frequencyData && waveformData) {
      return
    }

    audioContext = new AudioContext()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.82
    frequencyData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount))
    waveformData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount))
    sourceNode = audioContext.createMediaElementSource(audio)
    sourceNode.connect(analyser)
    analyser.connect(audioContext.destination)
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

  const loadImage = async (file: File) => {
    if (!sketchInstance) {
      throw new Error('p5 sketch is not ready yet.')
    }

    const nextUrl = URL.createObjectURL(file)

    try {
      const instance = sketchInstance
      const image = await new Promise<p5.Image>((resolve, reject) => {
        instance.loadImage(nextUrl, resolve, () => {
          reject(new Error('The selected image could not be decoded.'))
        })
      })

      loadedImage = image
      if (imageFileUrl) {
        URL.revokeObjectURL(imageFileUrl)
      }
      imageFileUrl = nextUrl
    } catch (error) {
      URL.revokeObjectURL(nextUrl)
      throw error
    }
  }

  const loadAudio = async (file: File) => {
    ensureAudioGraph()

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

  const togglePlayback = async () => {
    if (!audio.src) {
      throw new Error('Load a WAV file before pressing play.')
    }

    ensureAudioGraph()

    if (!audioContext) {
      throw new Error('Audio context is unavailable.')
    }

    if (audio.paused) {
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }
      await audio.play()
      return
    }

    audio.pause()
  }

  const getSnapshot = (): Snapshot => ({
    hasImage: Boolean(loadedImage),
    hasAudio: Boolean(audio.src),
    playing: !audio.paused && !audio.ended,
    currentTime: audio.currentTime,
    duration: Number.isFinite(audio.duration) ? audio.duration : 0,
  })

  const setBlockControls = (nextControls: BlockControls) => {
    blockControls = {
      spread: clamp(nextControls.spread, 0, 100),
      density: clamp(nextControls.density, 0, 100),
      randomness: clamp(nextControls.randomness, 0, 100),
    }
  }

  const dispose = () => {
    audio.pause()
    audio.src = ''

    if (imageFileUrl) {
      URL.revokeObjectURL(imageFileUrl)
    }
    if (audioFileUrl) {
      URL.revokeObjectURL(audioFileUrl)
    }

    sourceNode?.disconnect()
    analyser?.disconnect()
    sketchInstance?.remove()
    void audioContext?.close()
  }

  return {
    loadImage,
    loadAudio,
    togglePlayback,
    getSnapshot,
    setBlockControls,
    dispose,
  }
}

const resizeIfNeeded = (instance: p5, host: HTMLElement) => {
  const nextWidth = optionsSafeDimension(host.clientWidth)
  const nextHeight = optionsSafeDimension(host.clientHeight)

  if (instance.width !== nextWidth || instance.height !== nextHeight) {
    instance.resizeCanvas(nextWidth, nextHeight)
  }
}

const drawBackdrop = (instance: p5, metrics: GlitchMetrics) => {
  const pulse = 0.12 + metrics.level * 0.28

  for (let index = 0; index < 7; index += 1) {
    const y = (index / 6) * instance.height
    const alpha = 14 + index * 6 + metrics.treble * 18
    instance.fill(14, 48 + index * 10, 74 + pulse * 100, alpha)
    instance.rect(0, y, instance.width, instance.height / 8)
  }

  instance.push()
  instance.blendMode(instance.ADD)
  instance.fill(255, 110, 62, 30 + metrics.bass * 55)
  instance.circle(instance.width * 0.18, instance.height * 0.2, 220 + metrics.bass * 180)
  instance.fill(72, 188, 255, 28 + metrics.treble * 60)
  instance.circle(instance.width * 0.86, instance.height * 0.72, 260 + metrics.chaos * 220)
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
  image: p5.Image,
  metrics: GlitchMetrics,
  audioTime: number,
  blockControls: BlockControls,
) => {
  const bounds = getCoverBounds(image.width, image.height, instance.width * 0.84, instance.height * 0.8)
  const centerX = instance.width / 2 + Math.sin(audioTime * 1.7) * metrics.bass * 14
  const centerY = instance.height / 2 + Math.cos(audioTime * 2.2) * metrics.level * 10
  const x = centerX - bounds.width / 2
  const y = centerY - bounds.height / 2
  const channelOffset = 6 + metrics.treble * 24

  instance.push()
  instance.blendMode(instance.BLEND)
  instance.tint(255, 244)
  instance.image(image, x, y, bounds.width, bounds.height)
  instance.pop()

  instance.push()
  instance.blendMode(instance.ADD)
  instance.tint(255, 88, 72, 78 + metrics.chaos * 90)
  instance.image(image, x - channelOffset, y, bounds.width, bounds.height)
  instance.tint(72, 210, 255, 70 + metrics.treble * 120)
  instance.image(image, x + channelOffset, y + metrics.level * 8, bounds.width, bounds.height)
  instance.pop()

  const tearCount = Math.max(2, Math.round(3 + metrics.bass * 10))
  for (let index = 0; index < tearCount; index += 1) {
    const seed = audioTime * 0.8 + index * 0.2
    const normalizedY = instance.noise(seed, metrics.chaos * 5)
    const sliceSourceY = normalizedY * image.height * 0.92
    const sliceHeight = Math.max(18, image.height * (0.035 + metrics.level * 0.08))
    const sliceDestY = y + normalizedY * bounds.height
    const shift =
      (instance.noise(seed * 2.8, 2.4) - 0.5) * (40 + metrics.bass * 180)

    instance.copy(
      image,
      0,
      sliceSourceY,
      image.width,
      sliceHeight,
      x + shift,
      sliceDestY,
      bounds.width,
      (sliceHeight / image.height) * bounds.height,
    )
  }

  const spread = blockControls.spread / 100
  const density = blockControls.density / 100
  const randomness = blockControls.randomness / 100
  const jumpPhase = Math.floor(audioTime * mix(0.35, 6, randomness))
  const clusterCount = Math.max(1, Math.round(mix(5, 2, density)))
  const blockCount = Math.max(
    2,
    Math.round(mix(3, 24, density) * (0.7 + metrics.chaos * 0.9)),
  )
  const clusterRadius =
    Math.min(bounds.width, bounds.height) * mix(0.34, 0.08, density)
  const jumpJitter = mix(0.18, 1.2, randomness)

  for (let index = 0; index < blockCount; index += 1) {
    const clusterIndex = index % clusterCount
    const seed = jumpPhase * 9.7 + clusterIndex * 17.3 + index * 0.41
    const anchorU = centerWeighted(noise01(instance, seed, 1.3), spread)
    const anchorV = centerWeighted(noise01(instance, seed, 3.7), spread)
    const localAngle = noise01(instance, seed, 7.1) * Math.PI * 2
    const localDistance =
      noise01(instance, seed + audioTime * jumpJitter, 8.2) * clusterRadius
    const localScale = mix(0.18, 1, randomness)
    const sourceX = instance.noise(seed, 1.3) * image.width * 0.84
    const sourceY = instance.noise(seed, 4.7) * image.height * 0.84
    const sourceSize = image.width * (0.04 + metrics.chaos * 0.08)
    const destSize = bounds.width * (0.05 + metrics.bass * 0.06)
    const anchorX = x + anchorU * bounds.width
    const anchorY = y + anchorV * bounds.height
    const destX = clamp(
      anchorX + Math.cos(localAngle) * localDistance * localScale,
      x,
      x + bounds.width - destSize,
    )
    const destY = clamp(
      anchorY + Math.sin(localAngle) * localDistance * localScale,
      y,
      y + bounds.height - destSize,
    )

    instance.push()
    instance.tint(255, 180 + metrics.treble * 75)
    instance.copy(image, sourceX, sourceY, sourceSize, sourceSize, destX, destY, destSize, destSize)
    instance.pop()
  }
}

const drawOverlay = (instance: p5, metrics: GlitchMetrics) => {
  const scanlineGap = 6

  instance.push()
  for (let y = 0; y < instance.height; y += scanlineGap) {
    const alpha = 15 + metrics.treble * 26 + (y % 12 === 0 ? 12 : 0)
    instance.fill(255, 255, 255, alpha)
    instance.rect(0, y, instance.width, 1)
  }

  const streaks = Math.max(4, Math.round(8 + metrics.chaos * 18))
  for (let index = 0; index < streaks; index += 1) {
    const noiseValue = instance.noise(index * 0.8, instance.frameCount * 0.02)
    const streakY = noiseValue * instance.height
    const streakWidth = instance.width * (0.22 + metrics.level * 0.6)
    const streakX = (instance.noise(index * 1.4, instance.frameCount * 0.02 + 9) - 0.2) * instance.width
    instance.fill(255, 134, 92, 12 + metrics.bass * 45)
    instance.rect(streakX, streakY, streakWidth, 2 + metrics.level * 3)
  }

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

const noise01 = (instance: p5, x: number, y: number) => {
  return instance.noise(x, y)
}

const centerWeighted = (value: number, spread: number) => {
  return clamp(0.5 + (value - 0.5) * mix(0.12, 1, spread), 0, 1)
}

const mix = (start: number, end: number, amount: number) => {
  return start + (end - start) * amount
}

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value))
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
