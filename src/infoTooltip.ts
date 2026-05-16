const escapeHtml = (value: string) => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export const renderInfoTooltip = (text: string) => {
  const escapedText = escapeHtml(text)

  return `<span class="info-tooltip" tabindex="0" role="note" aria-label="${escapedText}" title="${escapedText}" data-tooltip="${escapedText}">i</span>`
}
