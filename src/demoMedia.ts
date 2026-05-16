export type DemoMediaSpec = {
  name: string
  type: string
  url: string
}

export const DEFAULT_DEMO_VISUAL: DemoMediaSpec = {
  name: 'Steamboat_Willie.mp4',
  type: 'video/mp4',
  url: '/Steamboat_Willie.mp4',
}

export const DEFAULT_DEMO_AUDIO: DemoMediaSpec = {
  name: 'duntz.wav',
  type: 'audio/wav',
  url: '/duntz.wav',
}

export const loadDemoMediaFile = async (
  spec: DemoMediaSpec,
  fetcher: typeof fetch = fetch,
) => {
  const response = await fetcher(spec.url)

  if (!response.ok) {
    throw new Error(`Demo media could not be loaded: ${spec.name}`)
  }

  const blob = await response.blob()

  return new File([blob], spec.name, {
    type: blob.type || spec.type,
  })
}
