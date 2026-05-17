export type VideoRhythmMode = 'normal' | 'seek' | 'multi'
export type VideoRhythmShape = 'strips' | 'cubes'

export type VideoRhythmMetrics = {
  level: number
  bass: number
  treble: number
}

export type VideoRhythmControls = {
  mode: VideoRhythmMode
  shape: VideoRhythmShape
  sensitivity: number
  bass: number
  treble: number
  seekRange: number
  slices: number
  motion: number
  mergeDelay: number
}

export type VideoRhythmSeekOptions = {
  controls: VideoRhythmControls
  metrics: VideoRhythmMetrics
  previousEnergy: number
  lastSeekAt: number
  now: number
}

export type VideoRhythmSeekTimeOptions = {
  audioTime: number
  duration: number
  seekRange: number
  random: () => number
}

export type SlicePlaybackStateLike = {
  paused: boolean
  readyState: number
}

export type VideoRhythmIdleMergeStepOptions = {
  lastSeekAt: number
  now: number
  mergeDelay: number
  sourceCount: number
}

export const DEFAULT_VIDEO_RHYTHM_CONTROLS: VideoRhythmControls = {
  mode: 'multi',
  shape: 'cubes',
  sensitivity: 55,
  bass: 75,
  treble: 50,
  seekRange: 23,
  slices: 9,
  motion: 35,
  mergeDelay: 4,
}

const SEEK_COOLDOWN_MS = 120

export const shouldTriggerVideoRhythmSeek = ({
  controls,
  metrics,
  previousEnergy,
  lastSeekAt,
  now,
}: VideoRhythmSeekOptions) => {
  if (controls.mode === 'normal' || controls.sensitivity <= 0) {
    return false
  }

  const energy = getVideoRhythmEnergy(metrics, controls)
  const threshold = getVideoRhythmTriggerThreshold(controls)
  const risingEdge = energy > previousEnergy + 0.05

  return now - lastSeekAt >= SEEK_COOLDOWN_MS && energy >= threshold && risingEdge
}

export const getVideoRhythmTriggerThreshold = (
  controls: Pick<VideoRhythmControls, 'sensitivity'>,
) => {
  return 0.18 + (1 - controls.sensitivity / 100) * 0.55
}

export const getVideoRhythmEnergy = (
  metrics: VideoRhythmMetrics,
  controls: VideoRhythmControls,
) => {
  const levelWeight = 1
  const bassWeight = controls.bass / 100
  const trebleWeight = controls.treble / 100
  const weightTotal = levelWeight + bassWeight + trebleWeight || 1

  return clamp(
    (metrics.level * levelWeight +
      metrics.bass * bassWeight +
      metrics.treble * trebleWeight) /
      weightTotal,
    0,
    1,
  )
}

export const getVideoRhythmSeekTime = ({
  audioTime,
  duration,
  seekRange,
  random,
}: VideoRhythmSeekTimeOptions) => {
  if (!Number.isFinite(duration) || duration <= 0) {
    return 0
  }

  const range = clamp(seekRange, 0, 100) / 100

  if (range >= 0.99) {
    return clamp(random(), 0, 1) * duration
  }

  const halfWindow = (duration * range) / 2
  const offset = (random() * 2 - 1) * halfWindow
  const wrapped = (audioTime + offset) % duration

  return wrapped < 0 ? wrapped + duration : wrapped
}

export const shouldResumeVideoSlice = (slice: SlicePlaybackStateLike) => {
  return slice.paused && slice.readyState >= 2
}

export const getVideoRhythmSeekSourceCount = (
  controls: Pick<VideoRhythmControls, 'mode' | 'slices'>,
) => {
  if (controls.mode !== 'multi') {
    return 1
  }

  return normalizeInteger(controls.slices, 1, 200, 6)
}

export const getVideoRhythmPieceOverscan = (motion: number) => {
  return Math.max(2, Math.ceil(Math.max(0, motion) * 2 + 2))
}

export const getVideoRhythmIdleMergeStep = ({
  lastSeekAt,
  now,
  mergeDelay,
  sourceCount,
}: VideoRhythmIdleMergeStepOptions) => {
  if (lastSeekAt <= 0 || sourceCount <= 1) {
    return 0
  }

  const delayMs = normalizeMergeDelay(mergeDelay) * 1000
  const elapsedMs = Math.max(0, now - lastSeekAt)

  return Math.min(sourceCount - 1, Math.floor(elapsedMs / delayMs))
}

export const normalizeVideoRhythmControls = (
  controls: Partial<VideoRhythmControls> | null | undefined,
): VideoRhythmControls => {
  return {
    mode: isVideoRhythmMode(controls?.mode)
      ? controls.mode
      : DEFAULT_VIDEO_RHYTHM_CONTROLS.mode,
    shape: isVideoRhythmShape(controls?.shape)
      ? controls.shape
      : DEFAULT_VIDEO_RHYTHM_CONTROLS.shape,
    sensitivity: normalizePercent(controls?.sensitivity, 55),
    bass: normalizePercent(controls?.bass, 75),
    treble: normalizePercent(controls?.treble, 50),
    seekRange: normalizePercent(controls?.seekRange, 70),
    slices: normalizeInteger(controls?.slices, 1, 200, 6),
    motion: normalizePercent(controls?.motion, 35),
    mergeDelay: normalizeMergeDelay(controls?.mergeDelay),
  }
}

const isVideoRhythmMode = (value: unknown): value is VideoRhythmMode => {
  return value === 'normal' || value === 'seek' || value === 'multi'
}

const isVideoRhythmShape = (value: unknown): value is VideoRhythmShape => {
  return value === 'strips' || value === 'cubes'
}

const normalizePercent = (value: unknown, fallback: number) => {
  return typeof value === 'number' && Number.isFinite(value)
    ? clamp(value, 0, 100)
    : fallback
}

const normalizeInteger = (
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) => {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.round(clamp(value, min, max))
    : fallback
}

const normalizeMergeDelay = (value: unknown) => {
  return typeof value === 'number' && Number.isFinite(value)
    ? clamp(value, 2, 10)
    : DEFAULT_VIDEO_RHYTHM_CONTROLS.mergeDelay
}

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value))
}
