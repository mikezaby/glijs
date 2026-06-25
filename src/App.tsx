import { Fader, Switch } from '@blibliki/ui'
import { useState } from 'react'
import type { AudioSourceMode } from './audioSource'
import { isWavFileInputVisible } from './audioSource'
import type {
  BlockControls,
  FilterGroupKey,
  FilterGroupState,
} from './glitchSketch'
import {
  DEFAULT_FILTER_GROUP_STATE,
  DEFAULT_FILTER_ORDER,
} from './glitchSketch'
import {
  DEFAULT_VIDEO_RHYTHM_CONTROLS,
  type VideoRhythmControls,
  type VideoRhythmMode,
  type VideoRhythmShape,
} from './videoRhythm'

export { DEFAULT_FILTER_ORDER } from './glitchSketch'

export const DEFAULT_BLOCK_CONTROLS: BlockControls = {
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

export type ControlKey = keyof BlockControls

export type ControlGroup = {
  filterKey?: FilterGroupKey
  name: string
  controls: Array<{
    key: ControlKey
    label: string
    title: string
  }>
}

export const CONTROL_GROUPS: ControlGroup[] = [
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

export const CONTROL_KEYS = CONTROL_GROUPS.flatMap((group) =>
  group.controls.map((control) => control.key),
)

export const FILTER_GROUP_LABELS: Record<FilterGroupKey, string> = {
  rgbSplit: 'RGB Split',
  tears: 'Tears',
  squares: 'Squares',
  scanlines: 'Scanlines',
  streaks: 'Streaks',
}

const DEFAULT_SETTINGS_TAB = 'squares'

const getControlGroupTabKey = (group: ControlGroup) =>
  group.filterKey ?? 'backdrop'

export const VIDEO_RHYTHM_CONTROL_FIELDS: Array<{
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

export type AudioDeviceOption = { id: string; label: string }

export type SketchUISnapshot = {
  playing: boolean
  recording: boolean
  rendering: boolean
  hasAudio: boolean
  hasVisualMedia: boolean
  currentTime: string
  duration: string
  progressPercent: number
}

export interface AppProps {
  blockControls?: BlockControls
  filterGroupState?: FilterGroupState
  filterOrder?: FilterGroupKey[]
  videoRhythmControls?: VideoRhythmControls
  audioSourceMode?: AudioSourceMode
  audioDevices?: AudioDeviceOption[]
  imageFileName?: string
  audioFileName?: string
  audioInputName?: string
  lastBackdropIntensity?: number
  snapshot?: SketchUISnapshot
  status?: string
  onControlChange?: (key: ControlKey, value: number) => void
  onFilterGroupStateChange?: (key: FilterGroupKey, enabled: boolean, solo: boolean) => void
  onFilterOrderChange?: (order: FilterGroupKey[]) => void
  onVideoRhythmChange?: (controls: VideoRhythmControls) => void
  onAudioSourceChange?: (mode: AudioSourceMode) => void
  onAudioDeviceConnect?: (deviceId: string) => void
  onImageFileChange?: (file: File) => void
  onAudioFileChange?: (file: File) => void
  onPlayClick?: () => void
  onRecordClick?: () => void
  onRenderClick?: () => void
}

export const InfoTooltip = ({ text }: { text: string }) => (
  <span
    className="info-tooltip"
    tabIndex={0}
    role="note"
    aria-label={text}
    title={text}
    data-tooltip={text}
  >
    i
  </span>
)

const ControlGroupSection = ({
  group,
  active,
  blockControls,
  filterGroupState,
  lastBackdropIntensity,
  onControlChange,
  onFilterGroupStateChange,
}: {
  group: ControlGroup
  active: boolean
  blockControls: BlockControls
  filterGroupState: FilterGroupState
  lastBackdropIntensity?: number
  onControlChange?: AppProps['onControlChange']
  onFilterGroupStateChange?: AppProps['onFilterGroupStateChange']
}) => {
  const tabKey = getControlGroupTabKey(group)

  return (
  <section
    id={`settings-tab-panel-${tabKey}`}
    className={`control-group settings-tab-panel grid gap-3 content-start p-4${active ? ' is-active' : ''}`}
    data-settings-tab-panel={tabKey}
    data-filter-control-group={group.filterKey}
    role="tabpanel"
    aria-labelledby={`settings-tab-${tabKey}`}
    hidden={!active}
  >
    <div className="flex gap-2.5 items-center">
      <h2 className="flex flex-1 gap-2 items-center m-0 text-content-primary text-[0.78rem] font-bold uppercase before:w-[3px] before:h-[1.1em] before:rounded-full before:bg-brand before:content-[''] after:flex-1 after:h-px after:bg-border-subtle after:content-['']">
        {group.name}
      </h2>
      {group.filterKey ? (
        <div className="inline-flex gap-1.5 items-center" aria-label={`${group.name} filter controls`}>
          <label className="inline-flex gap-1.5 items-center text-content-muted text-[0.72rem] font-bold uppercase cursor-pointer">
            <Switch
              data-filter-enabled={group.filterKey}
              size="sm"
              color="primary"
              checked={filterGroupState[group.filterKey]?.enabled ?? true}
              onCheckedChange={(enabled) =>
                onFilterGroupStateChange?.(
                  group.filterKey!,
                  enabled,
                  filterGroupState[group.filterKey!]?.solo ?? false,
                )
              }
            />
            Enable
          </label>
          <label className="inline-flex gap-1.5 items-center text-brand text-[0.72rem] font-bold uppercase cursor-pointer">
            <Switch
              data-filter-solo={group.filterKey}
              size="sm"
              color="secondary"
              checked={filterGroupState[group.filterKey]?.solo ?? false}
              onCheckedChange={(solo) =>
                onFilterGroupStateChange?.(
                  group.filterKey!,
                  filterGroupState[group.filterKey!]?.enabled ?? true,
                  solo,
                )
              }
            />
            Solo
          </label>
        </div>
      ) : (
        <div className="inline-flex gap-1.5 items-center" aria-label={`${group.name} effect controls`}>
          <label className="inline-flex gap-1.5 items-center text-content-muted text-[0.72rem] font-bold uppercase cursor-pointer">
            <Switch
              data-backdrop-enabled
              size="sm"
              color="primary"
              checked={(blockControls.backdropIntensity ?? 0) > 0}
              onCheckedChange={(checked) =>
                onControlChange?.(
                  'backdropIntensity',
                  checked
                    ? (lastBackdropIntensity ?? DEFAULT_BLOCK_CONTROLS.backdropIntensity)
                    : 0,
                )
              }
            />
            Enable
          </label>
        </div>
      )}
    </div>
    <div className="slider-row">
      {group.controls.map((control) => (
        <Fader
          key={control.key}
          name={control.label}
          title={control.title}
          min={0}
          max={100}
          orientation="horizontal"
          value={blockControls[control.key]}
          onChange={(value) => onControlChange?.(control.key, value)}
        />
      ))}
    </div>
  </section>
  )
}

const VideoRhythmControlsPanel = ({
  videoRhythmControls,
  onVideoRhythmChange,
}: {
  videoRhythmControls: VideoRhythmControls
  onVideoRhythmChange?: AppProps['onVideoRhythmChange']
}) => (
  <section
    id="settings-tab-panel-video-rhythm"
    className="settings-tab-panel control-group grid gap-3 content-start p-4"
    data-settings-tab-panel="video-rhythm"
    role="tabpanel"
    aria-labelledby="settings-tab-video-rhythm"
    hidden
  >
    <div className="flex gap-2.5 items-center">
      <h2 className="flex flex-1 gap-2 items-center m-0 text-content-primary text-[0.78rem] font-bold uppercase before:w-[3px] before:h-[1.1em] before:rounded-full before:bg-brand before:content-[''] after:flex-1 after:h-px after:bg-border-subtle after:content-['']">
        Video rhythm
      </h2>
    </div>
    <label
      className="grid gap-1.5 min-w-0"
      title="Controls how video time reacts to the WAV analysis."
    >
      <span className="text-content-primary text-[0.82rem] uppercase tracking-[0.08em]">
        Mode
        <InfoTooltip text="Controls how video time reacts to the WAV analysis." />
      </span>
      <select
        className="w-full border border-border-subtle rounded-md p-2.5 bg-surface-panel text-content-primary"
        data-video-rhythm-mode
        value={videoRhythmControls.mode}
        onChange={(e) =>
          onVideoRhythmChange?.({ ...videoRhythmControls, mode: e.target.value as VideoRhythmMode })
        }
      >
        <option value="normal">Normal playback</option>
        <option value="seek">Rhythm seek</option>
        <option value="multi">Multi-seek slices</option>
      </select>
    </label>
    <label
      className="grid gap-1.5 min-w-0"
      title="Controls the visual structure used by multi-seek mode."
    >
      <span className="text-content-primary text-[0.82rem] uppercase tracking-[0.08em]">
        Shape
        <InfoTooltip text="Controls the visual structure used by multi-seek mode." />
      </span>
      <select
        className="w-full border border-border-subtle rounded-md p-2.5 bg-surface-panel text-content-primary"
        data-video-rhythm-shape
        value={videoRhythmControls.shape}
        onChange={(e) =>
          onVideoRhythmChange?.({ ...videoRhythmControls, shape: e.target.value as VideoRhythmShape })
        }
      >
        <option value="strips">Strips</option>
        <option value="cubes">Cubes</option>
      </select>
    </label>
    <div className="slider-row">
      {VIDEO_RHYTHM_CONTROL_FIELDS.map((control) => (
        <Fader
          key={control.key}
          name={control.label}
          title={control.title}
          min={control.min}
          max={control.max}
          orientation="horizontal"
          value={videoRhythmControls[control.key] as number}
          onChange={(value) =>
            onVideoRhythmChange?.({ ...videoRhythmControls, [control.key]: value })
          }
        />
      ))}
    </div>
  </section>
)

const MediaControls = ({
  audioSourceMode,
  audioDevices,
  imageFileName,
  audioFileName,
  audioInputName,
  snapshot,
  onAudioSourceChange,
  onAudioDeviceConnect,
  onImageFileChange,
  onAudioFileChange,
  onPlayClick,
  onRecordClick,
  onRenderClick,
}: {
  audioSourceMode: AudioSourceMode
  audioDevices: AudioDeviceOption[]
  imageFileName?: string
  audioFileName?: string
  audioInputName?: string
  snapshot?: SketchUISnapshot
  onAudioSourceChange?: AppProps['onAudioSourceChange']
  onAudioDeviceConnect?: AppProps['onAudioDeviceConnect']
  onImageFileChange?: AppProps['onImageFileChange']
  onAudioFileChange?: AppProps['onAudioFileChange']
  onPlayClick?: AppProps['onPlayClick']
  onRecordClick?: AppProps['onRecordClick']
  onRenderClick?: AppProps['onRenderClick']
}) => {
  const [deviceId, setDeviceId] = useState('')

  return (
    <section
      id="settings-tab-panel-media"
      className="settings-tab-panel"
      data-settings-tab-panel="media"
      role="tabpanel"
      aria-labelledby="settings-tab-media"
      hidden
    >
      <div className="media-row">
        <label className="grid gap-1.5 min-w-0">
          <span className="text-content-primary text-[0.82rem] uppercase tracking-[0.08em]">Image / video</span>
          <input
            data-image-input
            type="file"
            className="w-full border border-border-subtle rounded-md p-2.5 bg-surface-panel text-content-muted file:mr-2.5 file:border-0 file:rounded file:py-1.5 file:px-2.5 file:bg-content-primary file:text-[#070707] file:font-bold file:cursor-pointer"
            accept="image/*,video/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onImageFileChange?.(file)
            }}
          />
          <small className="min-w-0 overflow-hidden text-content-muted text-ellipsis whitespace-nowrap" data-image-name>
            {imageFileName ?? 'No visual media'}
          </small>
        </label>

        <label
          className="grid gap-1.5 min-w-0"
          title="Select whether the visuals react to a WAV file or a live OS audio input."
        >
          <span className="text-content-primary text-[0.82rem] uppercase tracking-[0.08em]">Audio source</span>
          <select
            className="w-full border border-border-subtle rounded-md p-2.5 bg-surface-panel text-content-primary"
            data-audio-source
            value={audioSourceMode}
            onChange={(e) => onAudioSourceChange?.(e.target.value as AudioSourceMode)}
          >
            <option value="wav">WAV file</option>
            <option value="input">Audio input</option>
          </select>
        </label>

        <label
          className={`grid gap-1.5 min-w-0${isWavFileInputVisible(audioSourceMode) ? '' : ' is-hidden'}`}
          data-audio-file-field
        >
          <span className="text-content-primary text-[0.82rem] uppercase tracking-[0.08em]">WAV</span>
          <input
            data-audio-input
            type="file"
            className="w-full border border-border-subtle rounded-md p-2.5 bg-surface-panel text-content-muted file:mr-2.5 file:border-0 file:rounded file:py-1.5 file:px-2.5 file:bg-content-primary file:text-[#070707] file:font-bold file:cursor-pointer"
            accept=".wav,audio/wav"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onAudioFileChange?.(file)
            }}
          />
          <small className="min-w-0 overflow-hidden text-content-muted text-ellipsis whitespace-nowrap" data-audio-name>
            {audioFileName ?? 'No audio'}
          </small>
        </label>

        <div
          className={`input-source-field${audioSourceMode === 'input' ? ' is-visible' : ''}`}
          data-audio-input-controls
        >
          <label className="grid gap-1.5 min-w-0">
            <span className="text-content-primary text-[0.82rem] uppercase tracking-[0.08em]">Input device</span>
            <select
              className="w-full border border-border-subtle rounded-md p-2.5 bg-surface-panel text-content-primary"
              data-audio-device
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
            >
              <option value="">Default input</option>
              {audioDevices.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </label>
          <button
            data-audio-input-connect
            type="button"
            className="border border-border-subtle rounded-md px-[18px] py-2.5 bg-surface-subtle text-content-primary font-extrabold cursor-pointer disabled:cursor-not-allowed disabled:opacity-[0.42]"
            onClick={() => onAudioDeviceConnect?.(deviceId)}
          >
            Use input
          </button>
          <small className="min-w-0 overflow-hidden text-content-muted text-ellipsis whitespace-nowrap" data-audio-input-name>
            {audioInputName ?? 'No input connected'}
          </small>
        </div>

        <div className="grid grid-cols-[repeat(3,max-content)_minmax(90px,1fr)] gap-2 items-center min-w-[440px]">
          <button
            data-play
            type="button"
            className="border-0 rounded-md px-[18px] py-2.5 bg-brand text-[#050505] font-extrabold cursor-pointer disabled:cursor-not-allowed disabled:opacity-[0.42]"
            disabled={!snapshot?.hasAudio || snapshot?.recording}
            onClick={onPlayClick}
          >
            {snapshot?.playing ? 'Pause' : 'Play'}
          </button>
          <button
            data-record-video
            type="button"
            className="border border-border-subtle rounded-md px-[18px] py-2.5 bg-surface-subtle text-content-primary font-extrabold cursor-pointer disabled:cursor-not-allowed disabled:opacity-[0.42]"
            disabled={!snapshot?.hasAudio || !snapshot?.hasVisualMedia || snapshot?.rendering}
            onClick={onRecordClick}
          >
            {snapshot?.recording ? 'Stop & download' : 'Record video'}
          </button>
          <button
            data-render-video
            type="button"
            className="border border-border-subtle rounded-md px-[18px] py-2.5 bg-surface-subtle text-content-primary font-extrabold cursor-pointer disabled:cursor-not-allowed disabled:opacity-[0.42]"
            disabled={!snapshot?.hasAudio || !snapshot?.hasVisualMedia || snapshot?.recording}
            onClick={onRenderClick}
          >
            Render &amp; download
          </button>
          <div className="inline-flex justify-end gap-1.5 text-content-muted tabular-nums">
            <span data-current-time>{snapshot?.currentTime ?? '00:00'}</span>
            <span>/</span>
            <span data-duration>{snapshot?.duration ?? '00:00'}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

const FilterOrderControls = () => (
  <section
    id="settings-tab-panel-filter-order"
    className="settings-tab-panel control-group grid gap-3 content-start p-4"
    data-settings-tab-panel="filter-order"
    role="tabpanel"
    aria-labelledby="settings-tab-filter-order"
    hidden
  >
    <div className="flex gap-2.5 items-center">
      <h2 className="flex flex-1 gap-2 items-center m-0 text-content-primary text-[0.78rem] font-bold uppercase before:w-[3px] before:h-[1.1em] before:rounded-full before:bg-brand before:content-[''] after:flex-1 after:h-px after:bg-border-subtle after:content-['']">
        Filter order
      </h2>
    </div>
    <div className="filter-order-grid" data-filter-order-list />
  </section>
)

const SettingsTab = ({
  tabKey,
  label,
  active = false,
}: {
  tabKey: string
  label: string
  active?: boolean
}) => (
  <button
    id={`settings-tab-${tabKey}`}
    className={`settings-tab flex-none border border-transparent border-b-0 rounded-t-[7px] px-[13px] py-2 bg-transparent text-content-muted text-[0.76rem] font-extrabold uppercase tracking-[0.04em] cursor-pointer hover:text-content-primary hover:bg-white/[0.06]${active ? ' is-active' : ''}`}
    data-settings-tab={tabKey}
    type="button"
    role="tab"
    aria-selected={active}
    aria-controls={`settings-tab-panel-${tabKey}`}
    tabIndex={active ? 0 : -1}
  >
    {label}
  </button>
)

export const FilterOrderItems = ({
  filterOrder,
}: {
  filterOrder: FilterGroupKey[]
}) => (
  <>
    {filterOrder.map((key, index) => (
      <div className="grid grid-cols-[1fr_auto] gap-2.5 items-center p-2.5 rounded-md bg-surface-subtle" data-filter-order-item={key} key={key}>
        <span className="min-w-0 text-content-primary text-[0.86rem] font-bold">
          {index + 1}. {FILTER_GROUP_LABELS[key]}
        </span>
        <div className="inline-flex gap-1.5">
          <button
            type="button"
            className="border border-border-subtle rounded-[5px] px-2 py-1.5 bg-surface-subtle text-content-muted cursor-pointer disabled:cursor-not-allowed disabled:opacity-[0.35]"
            data-filter-move={key}
            data-filter-direction="up"
            disabled={index === 0}
            aria-label={`Move ${FILTER_GROUP_LABELS[key]} earlier`}
          >
            Up
          </button>
          <button
            type="button"
            className="border border-border-subtle rounded-[5px] px-2 py-1.5 bg-surface-subtle text-content-muted cursor-pointer disabled:cursor-not-allowed disabled:opacity-[0.35]"
            data-filter-move={key}
            data-filter-direction="down"
            disabled={index === filterOrder.length - 1}
            aria-label={`Move ${FILTER_GROUP_LABELS[key]} later`}
          >
            Down
          </button>
        </div>
      </div>
    ))}
  </>
)

export const App = ({
  blockControls = DEFAULT_BLOCK_CONTROLS,
  filterGroupState = DEFAULT_FILTER_GROUP_STATE,
  filterOrder: _filterOrder = DEFAULT_FILTER_ORDER,
  videoRhythmControls = DEFAULT_VIDEO_RHYTHM_CONTROLS,
  audioSourceMode = 'wav',
  audioDevices = [],
  imageFileName,
  audioFileName,
  audioInputName,
  lastBackdropIntensity = DEFAULT_BLOCK_CONTROLS.backdropIntensity,
  snapshot,
  status,
  onControlChange,
  onFilterGroupStateChange,
  onFilterOrderChange: _onFilterOrderChange,
  onVideoRhythmChange,
  onAudioSourceChange,
  onAudioDeviceConnect,
  onImageFileChange,
  onAudioFileChange,
  onPlayClick,
  onRecordClick,
  onRenderClick,
}: AppProps) => {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <button
        data-settings-toggle
        className="settings-toggle w-[86px] h-[34px] grid place-items-center border border-border-subtle border-b-0 rounded-t-[8px] px-0 bg-surface-panel/[0.94] text-content-primary cursor-pointer backdrop-blur-[14px] shadow-[0_-10px_36px_rgba(0,0,0,0.38)] is-open"
        type="button"
        aria-expanded="true"
        aria-controls="settings-panel"
        aria-label="Hide settings"
      >
        <span className="relative w-[42px] h-[3px] rounded-full bg-content-muted before:absolute before:content-[''] before:w-full before:h-full before:rounded-full before:bg-content-muted/[0.62] before:-top-[6px] after:absolute after:content-[''] after:w-full after:h-full after:rounded-full after:bg-content-muted/[0.62] after:top-[6px]" aria-hidden />
      </button>

      <section className="min-h-screen">
        <div id="sketch-host" className="sketch-host" />
      </section>

      <aside
        id="settings-panel"
        className="settings-panel grid grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden w-screen border-t border-border-subtle bg-surface-canvas/[0.88] backdrop-blur-[18px] shadow-[0_-24px_80px_rgba(0,0,0,0.42)] is-open"
        aria-label="Visual settings"
      >
        <div className="grid grid-cols-[minmax(180px,auto)_minmax(120px,1fr)_auto] gap-3 items-center min-h-[48px] px-3.5 py-2 border-b border-border-subtle">
          <div className="flex gap-3 items-baseline min-w-0">
            <span className="text-content-primary text-[0.82rem] uppercase tracking-[0.08em]">Settings</span>
            <p className="min-w-0 overflow-hidden text-content-muted text-[0.78rem] text-ellipsis whitespace-nowrap m-0 min-h-[1.4em]" data-status>
              {status ?? 'Load image or video and WAV.'}
            </p>
          </div>
          <div className="overflow-hidden h-1.5 min-w-[120px] rounded-full bg-surface-subtle" aria-hidden="true">
            <div
              className="progress-fill"
              data-progress
              style={{ width: `${snapshot?.progressPercent ?? 0}%` }}
            />
          </div>
          <button
            data-settings-close
            className="border border-border-subtle rounded-md px-2.5 py-[7px] bg-surface-panel text-content-muted cursor-pointer"
            type="button"
            aria-label="Hide settings"
          >
            Close
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto px-3.5 pt-2 pb-0 border-b border-border-subtle [scrollbar-width:thin]" data-settings-tabs role="tablist">
          <SettingsTab tabKey="media" label="Media" />
          <SettingsTab tabKey="video-rhythm" label="Video rhythm" />
          <SettingsTab tabKey="filter-order" label="Filter order" />
          {CONTROL_GROUPS.map((group) => {
            const tabKey = getControlGroupTabKey(group)

            return (
              <SettingsTab
                tabKey={tabKey}
                label={group.name}
                active={tabKey === DEFAULT_SETTINGS_TAB}
                key={tabKey}
              />
            )
          })}
        </div>

        <div className="min-h-0 overflow-auto">
          <MediaControls
            audioSourceMode={audioSourceMode}
            audioDevices={audioDevices}
            imageFileName={imageFileName}
            audioFileName={audioFileName}
            audioInputName={audioInputName}
            snapshot={snapshot}
            onAudioSourceChange={onAudioSourceChange}
            onAudioDeviceConnect={onAudioDeviceConnect}
            onImageFileChange={onImageFileChange}
            onAudioFileChange={onAudioFileChange}
            onPlayClick={onPlayClick}
            onRecordClick={onRecordClick}
            onRenderClick={onRenderClick}
          />
          <VideoRhythmControlsPanel
            videoRhythmControls={videoRhythmControls}
            onVideoRhythmChange={onVideoRhythmChange}
          />
          <FilterOrderControls />
          {CONTROL_GROUPS.map((group) => (
            <ControlGroupSection
              group={group}
              active={getControlGroupTabKey(group) === DEFAULT_SETTINGS_TAB}
              key={group.name}
              blockControls={blockControls}
              filterGroupState={filterGroupState}
              lastBackdropIntensity={lastBackdropIntensity}
              onControlChange={onControlChange}
              onFilterGroupStateChange={onFilterGroupStateChange}
            />
          ))}
        </div>
      </aside>
    </main>
  )
}
