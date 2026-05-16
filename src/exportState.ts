export type ExportSnapshot = {
  hasAudio: boolean
  hasVisualMedia: boolean
  recording: boolean
  rendering: boolean
}

export const canRenderVideo = (snapshot: ExportSnapshot) => {
  return (
    snapshot.hasAudio &&
    snapshot.hasVisualMedia &&
    !snapshot.recording &&
    !snapshot.rendering
  )
}

export const canRecordVideo = (snapshot: ExportSnapshot) => {
  return snapshot.hasAudio && snapshot.hasVisualMedia && !snapshot.rendering
}

export const getRenderButtonLabel = (snapshot: Pick<ExportSnapshot, 'rendering'>) => {
  return snapshot.rendering ? 'Rendering...' : 'Render & download'
}
