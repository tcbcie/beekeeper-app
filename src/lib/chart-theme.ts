// Readable Chart.js text for the app's 50+ users, in light and dark mode (C7b-24).
//
// Charts left to Chart.js defaults get 12px grey text tuned for a white page, and several research
// charts set 9-10px labels on top. themeChartOptions() fills in 14px text and theme-aware colours for
// the legend, title, value labels and every axis, keeping any colour or font a chart sets itself
// (e.g. a red temperature axis). Colours follow dark mode on the next render, like the scale and TBR
// charts, so pass isDarkMode() into the options' useMemo dependencies.

type AnyRecord = Record<string, unknown>

const CHART_FONT_SIZE = 14

export function isDarkMode(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
}

export function chartColours(isDark: boolean): { ink: string; grid: string } {
  return isDark ? { ink: '#d1d5db', grid: '#374151' } : { ink: '#374151', grid: '#e5e7eb' }
}

const asRecord = (value: unknown): AnyRecord => (value && typeof value === 'object' ? value as AnyRecord : {})

// Text settings: theme colour unless the chart chose one, 14px unless it chose a larger size
function themedText(existing: unknown, ink: string): AnyRecord {
  const current = asRecord(existing)
  const font = asRecord(current.font)
  const size = typeof font.size === 'number' && font.size > CHART_FONT_SIZE ? font.size : CHART_FONT_SIZE
  return { color: ink, ...current, font: { ...font, size } }
}

export function themeChartOptions<T extends object>(options: T, isDark: boolean): T {
  const { ink, grid } = chartColours(isDark)
  const source = options as AnyRecord
  const plugins = { ...asRecord(source.plugins) }

  const legend = asRecord(plugins.legend)
  plugins.legend = { ...legend, labels: themedText(legend.labels, ink) }
  if (plugins.title) plugins.title = themedText(plugins.title, ink)
  const datalabels = asRecord(plugins.datalabels)
  if (plugins.datalabels && datalabels.display !== false) plugins.datalabels = themedText(datalabels, ink)

  const scales: AnyRecord = {}
  for (const [key, value] of Object.entries(asRecord(source.scales))) {
    const scale = asRecord(value)
    scales[key] = {
      ...scale,
      ticks: themedText(scale.ticks, ink),
      title: themedText(scale.title, ink),
      grid: { color: grid, ...asRecord(scale.grid) },
    }
  }

  return { ...source, plugins, ...(source.scales ? { scales } : {}) } as T
}
