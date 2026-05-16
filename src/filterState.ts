export type FilterGroupKey =
  | 'rgbSplit'
  | 'tears'
  | 'squares'
  | 'scanlines'
  | 'streaks'

export type FilterGroupControlState = {
  enabled: boolean
  solo: boolean
}

export type FilterGroupState = Record<FilterGroupKey, FilterGroupControlState>

export const DEFAULT_FILTER_ORDER: FilterGroupKey[] = [
  'rgbSplit',
  'tears',
  'squares',
  'scanlines',
  'streaks',
]

export const DEFAULT_FILTER_GROUP_STATE: FilterGroupState = {
  rgbSplit: { enabled: true, solo: false },
  tears: { enabled: true, solo: false },
  squares: { enabled: true, solo: false },
  scanlines: { enabled: true, solo: false },
  streaks: { enabled: true, solo: false },
}

export const normalizeFilterOrder = (order: unknown) => {
  if (!Array.isArray(order)) {
    return [...DEFAULT_FILTER_ORDER]
  }

  const ordered = order.filter((key, index): key is FilterGroupKey => {
    return (
      typeof key === 'string' &&
      DEFAULT_FILTER_ORDER.includes(key as FilterGroupKey) &&
      order.indexOf(key) === index
    )
  })
  const missing = DEFAULT_FILTER_ORDER.filter((key) => !ordered.includes(key))

  return [...ordered, ...missing]
}

export const normalizeFilterGroupState = (
  state: Partial<FilterGroupState> | null | undefined,
): FilterGroupState => {
  return DEFAULT_FILTER_ORDER.reduce<FilterGroupState>(
    (groups, key) => ({
      ...groups,
      [key]: {
        enabled: state?.[key]?.enabled ?? DEFAULT_FILTER_GROUP_STATE[key].enabled,
        solo: state?.[key]?.solo ?? DEFAULT_FILTER_GROUP_STATE[key].solo,
      },
    }),
    { ...DEFAULT_FILTER_GROUP_STATE },
  )
}

export const resolveActiveFilterOrder = (
  filterOrder: FilterGroupKey[],
  state: FilterGroupState,
) => {
  const normalizedOrder = normalizeFilterOrder(filterOrder)
  const soloedGroups = normalizedOrder.filter((group) => state[group].solo)

  if (soloedGroups.length > 0) {
    return soloedGroups
  }

  return normalizedOrder.filter((group) => state[group].enabled)
}
