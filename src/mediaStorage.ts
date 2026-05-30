import {
  normalizeAudioSourceMode,
  type AudioSourceMode,
} from './audioSource'
import type { BlockControls } from './glitchSketch'
import {
  normalizeFilterGroupState,
  normalizeFilterOrder,
  type FilterGroupKey,
  type FilterGroupState,
} from './filterState'
import {
  normalizeVideoRhythmControls,
  type VideoRhythmControls,
} from './videoRhythm'

type StoredMediaKind = 'image' | 'audio'

type StoredMediaManifest = {
  image?: StoredMediaItem
  audio?: StoredMediaItem
}

type StoredMediaItem = {
  name: string
  type: string
  size: number
  lastModified: number
}

const DB_NAME = 'glijs-media-store'
const STORE_NAME = 'files'
const DB_VERSION = 1
const MANIFEST_KEY = 'glijs:selected-media'
const BLOCK_CONTROLS_KEY = 'glijs:block-controls'
const FILTER_ORDER_KEY = 'glijs:filter-order'
const FILTER_GROUP_STATE_KEY = 'glijs:filter-group-state'
const VIDEO_RHYTHM_CONTROLS_KEY = 'glijs:video-rhythm-controls'
const AUDIO_SOURCE_MODE_KEY = 'glijs:audio-source-mode'

let dbPromise: Promise<IDBDatabase> | null = null

export async function saveStoredMedia(kind: StoredMediaKind, file: File) {
  const db = await openMediaDb()
  await writeFile(db, kind, file)

  const manifest = readManifest()
  manifest[kind] = {
    name: file.name,
    type: file.type,
    size: file.size,
    lastModified: file.lastModified,
  }
  writeManifest(manifest)
}

export async function loadStoredMedia(kind: StoredMediaKind): Promise<File | null> {
  const manifest = readManifest()
  const item = manifest[kind]

  if (!item) {
    return null
  }

  const db = await openMediaDb()
  const file = await readFile(db, kind)

  if (!file) {
    delete manifest[kind]
    writeManifest(manifest)
    return null
  }

  return file
}

export function saveStoredBlockControls(controls: BlockControls) {
  localStorage.setItem(BLOCK_CONTROLS_KEY, JSON.stringify(controls))
}

export function loadStoredBlockControls(): Partial<BlockControls> | null {
  const rawControls = localStorage.getItem(BLOCK_CONTROLS_KEY)

  if (!rawControls) {
    return null
  }

  try {
    const controls = JSON.parse(rawControls) as Partial<BlockControls>

    return {
      spread: normalizeControlValue(controls.spread),
      density: normalizeControlValue(controls.density),
      size: normalizeControlValue(controls.size),
      noise: normalizeControlValue(controls.noise),
      randomness: normalizeControlValue(controls.randomness),
      tearCount: normalizeControlValue(controls.tearCount),
      tearHeight: normalizeControlValue(controls.tearHeight),
      tearShift: normalizeControlValue(controls.tearShift),
      rgbAmount: normalizeControlValue(controls.rgbAmount),
      rgbOpacity: normalizeControlValue(controls.rgbOpacity),
      rgbBalance: normalizeControlValue(controls.rgbBalance),
      rgbDrift: normalizeControlValue(controls.rgbDrift),
      rgbSaturation: normalizeControlValue(controls.rgbSaturation),
      rgbAudioTint: normalizeControlValue(controls.rgbAudioTint),
      scanlineDensity: normalizeControlValue(controls.scanlineDensity),
      scanlineOpacity: normalizeControlValue(controls.scanlineOpacity),
      streakCount: normalizeControlValue(controls.streakCount),
      streakLength: normalizeControlValue(controls.streakLength),
      streakOpacity: normalizeControlValue(controls.streakOpacity),
      backdropIntensity: normalizeControlValue(controls.backdropIntensity),
    }
  } catch {
    localStorage.removeItem(BLOCK_CONTROLS_KEY)
    return null
  }
}

export function saveStoredFilterOrder(order: FilterGroupKey[]) {
  localStorage.setItem(FILTER_ORDER_KEY, JSON.stringify(normalizeFilterOrder(order)))
}

export function loadStoredFilterOrder(): FilterGroupKey[] | null {
  const rawOrder = localStorage.getItem(FILTER_ORDER_KEY)

  if (!rawOrder) {
    return null
  }

  try {
    return normalizeFilterOrder(JSON.parse(rawOrder))
  } catch {
    localStorage.removeItem(FILTER_ORDER_KEY)
    return null
  }
}

export function saveStoredFilterGroupState(state: FilterGroupState) {
  localStorage.setItem(
    FILTER_GROUP_STATE_KEY,
    JSON.stringify(normalizeFilterGroupState(state)),
  )
}

export function loadStoredFilterGroupState(): FilterGroupState | null {
  const rawState = localStorage.getItem(FILTER_GROUP_STATE_KEY)

  if (!rawState) {
    return null
  }

  try {
    return normalizeFilterGroupState(JSON.parse(rawState))
  } catch {
    localStorage.removeItem(FILTER_GROUP_STATE_KEY)
    return null
  }
}

export function saveStoredVideoRhythmControls(controls: VideoRhythmControls) {
  localStorage.setItem(
    VIDEO_RHYTHM_CONTROLS_KEY,
    JSON.stringify(normalizeVideoRhythmControls(controls)),
  )
}

export function loadStoredVideoRhythmControls(): VideoRhythmControls | null {
  const rawControls = localStorage.getItem(VIDEO_RHYTHM_CONTROLS_KEY)

  if (!rawControls) {
    return null
  }

  try {
    return normalizeVideoRhythmControls(JSON.parse(rawControls))
  } catch {
    localStorage.removeItem(VIDEO_RHYTHM_CONTROLS_KEY)
    return null
  }
}

export function saveStoredAudioSourceMode(mode: AudioSourceMode) {
  localStorage.setItem(AUDIO_SOURCE_MODE_KEY, mode)
}

export function loadStoredAudioSourceMode(): AudioSourceMode | null {
  const rawMode = localStorage.getItem(AUDIO_SOURCE_MODE_KEY)

  if (!rawMode) {
    return null
  }

  return normalizeAudioSourceMode(rawMode)
}

const openMediaDb = () => {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.addEventListener('upgradeneeded', () => {
      request.result.createObjectStore(STORE_NAME)
    })

    request.addEventListener('success', () => {
      resolve(request.result)
    })

    request.addEventListener('error', () => {
      reject(request.error ?? new Error('Media storage could not be opened.'))
    })
  })

  return dbPromise
}

const writeFile = (db: IDBDatabase, kind: StoredMediaKind, file: File) => {
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    store.put(file, kind)

    transaction.addEventListener('complete', () => {
      resolve()
    })

    transaction.addEventListener('error', () => {
      reject(transaction.error ?? new Error('Media file could not be saved.'))
    })
  })
}

const readFile = (db: IDBDatabase, kind: StoredMediaKind) => {
  return new Promise<File | null>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(kind)

    request.addEventListener('success', () => {
      resolve(request.result instanceof File ? request.result : null)
    })

    request.addEventListener('error', () => {
      reject(request.error ?? new Error('Media file could not be loaded.'))
    })
  })
}

const readManifest = (): StoredMediaManifest => {
  const rawManifest = localStorage.getItem(MANIFEST_KEY)

  if (!rawManifest) {
    return {}
  }

  try {
    return JSON.parse(rawManifest) as StoredMediaManifest
  } catch {
    localStorage.removeItem(MANIFEST_KEY)
    return {}
  }
}

const writeManifest = (manifest: StoredMediaManifest) => {
  localStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest))
}

const normalizeControlValue = (value: unknown) => {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : undefined
}
