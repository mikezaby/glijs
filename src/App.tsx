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
  onControlChange,
  onFilterGroupStateChange,
}: {
  group: ControlGroup
  active: boolean
  blockControls: BlockControls
  filterGroupState: FilterGroupState
  onControlChange?: AppProps['onControlChange']
  onFilterGroupStateChange?: AppProps['onFilterGroupStateChange']
}) => {
  const tabKey = getControlGroupTabKey(group)

  return (
  <section
    id={`settings-tab-panel-${tabKey}`}
    className={`settings-tab-panel control-group${active ? ' is-active' : ''}`}
    data-settings-tab-panel={tabKey}
    data-filter-control-group={group.filterKey}
    role="tabpanel"
    aria-labelledby={`settings-tab-${tabKey}`}
    hidden={!active}
  >
    <div className="control-group__head">
      <h2>{group.name}</h2>
      {group.filterKey ? (
        <div className="filter-toggles" aria-label={`${group.name} filter controls`}>
          <label className="toggle-field">
            <input
              data-filter-enabled={group.filterKey}
              type="checkbox"
              checked={filterGroupState[group.filterKey]?.enabled ?? true}
              onChange={(e) =>
                onFilterGroupStateChange?.(
                  group.filterKey!,
                  e.target.checked,
                  filterGroupState[group.filterKey!]?.solo ?? false,
                )
              }
            />
            <span>Enable</span>
          </label>
          <label className="toggle-field toggle-field--solo">
            <input
              data-filter-solo={group.filterKey}
              type="checkbox"
              checked={filterGroupState[group.filterKey]?.solo ?? false}
              onChange={(e) =>
                onFilterGroupStateChange?.(
                  group.filterKey!,
                  filterGroupState[group.filterKey!]?.enabled ?? true,
                  e.target.checked,
                )
              }
            />
            <span>Solo</span>
          </label>
        </div>
      ) : (
        <div className="filter-toggles" aria-label={`${group.name} effect controls`}>
          <label className="toggle-field">
            <input
              data-backdrop-enabled
              type="checkbox"
              defaultChecked
            />
            <span>Enable</span>
          </label>
        </div>
      )}
    </div>
    <div className="settings-row slider-row">
      {group.controls.map((control) => (
        <label className="slider-field" title={control.title} key={control.key}>
          <div className="slider-field__head">
            <span className="field-label">
              {control.label}
              <InfoTooltip text={control.title} />
            </span>
            <strong data-control-value={control.key}>
              {blockControls[control.key]}%
            </strong>
          </div>
          <input
            data-control-slider={control.key}
            type="range"
            min="0"
            max="100"
            defaultValue={blockControls[control.key]}
            onChange={(e) => onControlChange?.(control.key, Number(e.target.value))}
          />
        </label>
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
    className="settings-tab-panel control-group"
    data-settings-tab-panel="video-rhythm"
    role="tabpanel"
    aria-labelledby="settings-tab-video-rhythm"
    hidden
  >
    <div className="control-group__head">
      <h2>Video rhythm</h2>
    </div>
    <label
      className="select-field"
      title="Controls how video time reacts to the WAV analysis."
    >
      <span className="field-label">
        Mode
        <InfoTooltip text="Controls how video time reacts to the WAV analysis." />
      </span>
      <select
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
      className="select-field"
      title="Controls the visual structure used by multi-seek mode."
    >
      <span className="field-label">
        Shape
        <InfoTooltip text="Controls the visual structure used by multi-seek mode." />
      </span>
      <select
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
    <div className="settings-row slider-row">
      {VIDEO_RHYTHM_CONTROL_FIELDS.map((control) => (
        <label className="slider-field" title={control.title} key={control.key}>
          <div className="slider-field__head">
            <span className="field-label">
              {control.label}
              <InfoTooltip text={control.title} />
            </span>
            <strong data-video-rhythm-value={control.key}>
              {videoRhythmControls[control.key]}
            </strong>
          </div>
          <input
            data-video-rhythm-slider={control.key}
            type="range"
            min={control.min}
            max={control.max}
            defaultValue={videoRhythmControls[control.key]}
            onChange={(e) =>
              onVideoRhythmChange?.({ ...videoRhythmControls, [control.key]: Number(e.target.value) })
            }
          />
        </label>
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
      <div className="settings-row media-row">
        <label className="file-field">
          <span>Image / video</span>
          <input
            data-image-input
            type="file"
            accept="image/*,video/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onImageFileChange?.(file)
            }}
          />
          <small data-image-name>{imageFileName ?? 'No visual media'}</small>
        </label>

        <label
          className="select-field"
          title="Select whether the visuals react to a WAV file or a live OS audio input."
        >
          <span>Audio source</span>
          <select
            data-audio-source
            value={audioSourceMode}
            onChange={(e) => onAudioSourceChange?.(e.target.value as AudioSourceMode)}
          >
            <option value="wav">WAV file</option>
            <option value="input">Audio input</option>
          </select>
        </label>

        <label
          className={`file-field${isWavFileInputVisible(audioSourceMode) ? '' : ' is-hidden'}`}
          data-audio-file-field
        >
          <span>WAV</span>
          <input
            data-audio-input
            type="file"
            accept=".wav,audio/wav"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onAudioFileChange?.(file)
            }}
          />
          <small data-audio-name>{audioFileName ?? 'No audio'}</small>
        </label>

        <div
          className={`input-source-field${audioSourceMode === 'input' ? ' is-visible' : ''}`}
          data-audio-input-controls
        >
          <label className="select-field">
            <span>Input device</span>
            <select data-audio-device value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
              <option value="">Default input</option>
              {audioDevices.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </label>
          <button
            data-audio-input-connect
            type="button"
            className="transport__button transport__button--secondary"
            onClick={() => onAudioDeviceConnect?.(deviceId)}
          >
            Use input
          </button>
          <small data-audio-input-name>{audioInputName ?? 'No input connected'}</small>
        </div>

        <div className="transport">
          <button
            data-play
            type="button"
            className="transport__button"
            disabled={!snapshot?.hasAudio || snapshot?.recording}
            onClick={onPlayClick}
          >
            {snapshot?.playing ? 'Pause' : 'Play'}
          </button>
          <button
            data-record-video
            type="button"
            className="transport__button transport__button--secondary"
            disabled={!snapshot?.hasAudio || !snapshot?.hasVisualMedia || snapshot?.rendering}
            onClick={onRecordClick}
          >
            {snapshot?.recording ? 'Stop & download' : 'Record video'}
          </button>
          <button
            data-render-video
            type="button"
            className="transport__button transport__button--secondary"
            disabled={!snapshot?.hasAudio || !snapshot?.hasVisualMedia || snapshot?.recording}
            onClick={onRenderClick}
          >
            Render &amp; download
          </button>
          <div className="transport__time">
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
    className="settings-tab-panel control-group"
    data-settings-tab-panel="filter-order"
    role="tabpanel"
    aria-labelledby="settings-tab-filter-order"
    hidden
  >
    <div className="control-group__head">
      <h2>Filter order</h2>
    </div>
    <div className="filter-order" data-filter-order-list />
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
    className={`settings-tab${active ? ' is-active' : ''}`}
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
      <div className="filter-order__item" data-filter-order-item={key} key={key}>
        <span>
          {index + 1}. {FILTER_GROUP_LABELS[key]}
        </span>
        <div className="filter-order__actions">
          <button
            type="button"
            data-filter-move={key}
            data-filter-direction="up"
            disabled={index === 0}
            aria-label={`Move ${FILTER_GROUP_LABELS[key]} earlier`}
          >
            Up
          </button>
          <button
            type="button"
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
  lastBackdropIntensity: _lastBackdropIntensity = DEFAULT_BLOCK_CONTROLS.backdropIntensity,
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
    <main className="shell">
      <button
        data-settings-toggle
        className="settings-toggle is-open"
        type="button"
        aria-expanded="true"
        aria-controls="settings-panel"
        aria-label="Hide settings"
      >
        <span className="settings-toggle__grip" aria-hidden="true" />
      </button>

      <section className="stage">
        <div id="sketch-host" className="sketch-host" />
      </section>

      <aside
        id="settings-panel"
        className="settings is-open"
        aria-label="Visual settings"
      >
        <div className="settings__header">
          <div className="settings__title">
            <span>Settings</span>
            <p className="status" data-status>
              {status ?? 'Load image or video and WAV.'}
            </p>
          </div>
          <div className="progress" aria-hidden="true">
            <div
              className="progress__fill"
              data-progress
              style={{ width: `${snapshot?.progressPercent ?? 0}%` }}
            />
          </div>
          <button
            data-settings-close
            className="settings__close"
            type="button"
            aria-label="Hide settings"
          >
            Close
          </button>
        </div>

        <div className="settings-tabs" data-settings-tabs role="tablist">
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

        <div className="settings-tab-panels">
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
              onControlChange={onControlChange}
              onFilterGroupStateChange={onFilterGroupStateChange}
            />
          ))}
        </div>
      </aside>
    </main>
  )
}
