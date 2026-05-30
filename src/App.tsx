import type {
  BlockControls,
  FilterGroupKey,
} from './glitchSketch'
import {
  DEFAULT_VIDEO_RHYTHM_CONTROLS,
  type VideoRhythmControls,
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

const ControlGroupSection = ({ group }: { group: ControlGroup }) => (
  <section
    className="control-group"
    data-filter-control-group={group.filterKey}
  >
    <div className="control-group__head">
      <h2>{group.name}</h2>
      {group.filterKey ? (
        <div className="filter-toggles" aria-label={`${group.name} filter controls`}>
          <label className="toggle-field">
            <input
              data-filter-enabled={group.filterKey}
              type="checkbox"
              defaultChecked
            />
            <span>Enable</span>
          </label>
          <label className="toggle-field toggle-field--solo">
            <input data-filter-solo={group.filterKey} type="checkbox" />
            <span>Solo</span>
          </label>
        </div>
      ) : null}
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
              {DEFAULT_BLOCK_CONTROLS[control.key]}%
            </strong>
          </div>
          <input
            data-control-slider={control.key}
            type="range"
            min="0"
            max="100"
            defaultValue={DEFAULT_BLOCK_CONTROLS[control.key]}
          />
        </label>
      ))}
    </div>
  </section>
)

const VideoRhythmControls = () => (
  <section className="control-group">
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
      <select data-video-rhythm-mode defaultValue="normal">
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
      <select data-video-rhythm-shape defaultValue="cubes">
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
              {DEFAULT_VIDEO_RHYTHM_CONTROLS[control.key]}
            </strong>
          </div>
          <input
            data-video-rhythm-slider={control.key}
            type="range"
            min={control.min}
            max={control.max}
            defaultValue={DEFAULT_VIDEO_RHYTHM_CONTROLS[control.key]}
          />
        </label>
      ))}
    </div>
  </section>
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

export const App = () => (
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
        <span>Settings</span>
        <button
          data-settings-close
          className="settings__close"
          type="button"
          aria-label="Hide settings"
        >
          Close
        </button>
      </div>

      <div className="settings-row media-row">
        <label className="file-field">
          <span>Image / video</span>
          <input data-image-input type="file" accept="image/*,video/*" />
          <small data-image-name>No visual media</small>
        </label>

        <label
          className="select-field"
          title="Select whether the visuals react to a WAV file or a live OS audio input."
        >
          <span>Audio source</span>
          <select data-audio-source defaultValue="wav">
            <option value="wav">WAV file</option>
            <option value="input">Audio input</option>
          </select>
        </label>

        <label className="file-field" data-audio-file-field>
          <span>WAV</span>
          <input data-audio-input type="file" accept=".wav,audio/wav" />
          <small data-audio-name>No audio</small>
        </label>

        <div className="input-source-field" data-audio-input-controls>
          <label className="select-field">
            <span>Input device</span>
            <select data-audio-device>
              <option value="">Default input</option>
            </select>
          </label>
          <button
            data-audio-input-connect
            type="button"
            className="transport__button transport__button--secondary"
          >
            Use input
          </button>
          <small data-audio-input-name>No input connected</small>
        </div>

        <div className="transport">
          <button data-play type="button" className="transport__button" disabled>
            Play
          </button>
          <button
            data-record-video
            type="button"
            className="transport__button transport__button--secondary"
            disabled
          >
            Record video
          </button>
          <button
            data-render-video
            type="button"
            className="transport__button transport__button--secondary"
            disabled
          >
            Render &amp; download
          </button>
          <div className="transport__time">
            <span data-current-time>00:00</span>
            <span>/</span>
            <span data-duration>00:00</span>
          </div>
        </div>
      </div>

      <div className="progress" aria-hidden="true">
        <div className="progress__fill" data-progress />
      </div>

      <p className="status" data-status>
        Load image or video and WAV.
      </p>

      <VideoRhythmControls />

      <section className="control-group">
        <h2>Filter order</h2>
        <div className="filter-order" data-filter-order-list />
      </section>

      <div className="control-groups">
        {CONTROL_GROUPS.map((group) => (
          <ControlGroupSection group={group} key={group.name} />
        ))}
      </div>
    </aside>
  </main>
)
