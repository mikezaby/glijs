export type VisualMediaKind = 'image' | 'video'

export type VisualMediaFileLike = {
  type: string
}

export type VisualVideoStateLike = {
  readyState: number
  videoHeight: number
  videoWidth: number
}

export const getVisualMediaKind = (
  file: VisualMediaFileLike,
): VisualMediaKind | null => {
  if (file.type.startsWith('image/')) {
    return 'image'
  }

  if (file.type.startsWith('video/')) {
    return 'video'
  }

  return null
}

export const isVisualVideoDrawable = (video: VisualVideoStateLike) => {
  return video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0
}

export const getDrawableVisualVideoIndex = (
  videos: VisualVideoStateLike[],
  preferredIndex = 0,
) => {
  const preferred = videos[preferredIndex]

  if (preferred && isVisualVideoDrawable(preferred)) {
    return preferredIndex
  }

  return videos.findIndex(isVisualVideoDrawable)
}
