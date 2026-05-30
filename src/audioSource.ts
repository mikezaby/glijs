export type AudioSourceMode = 'wav' | 'input'

export const normalizeAudioSourceMode = (
  value: string | null | undefined,
): AudioSourceMode => {
  return value === 'input' ? 'input' : 'wav'
}

export const getAudioMissingStatus = (mode: AudioSourceMode) => {
  return mode === 'input' ? 'Audio input missing.' : 'WAV missing.'
}

export const getAudioMonitorGain = (mode: AudioSourceMode) => {
  return mode === 'input' ? 0 : 1
}

export const isWavFileInputVisible = (mode: AudioSourceMode) => {
  return mode === 'wav'
}
