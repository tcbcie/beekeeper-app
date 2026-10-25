import { describe, it, expect } from 'vitest'
import { themeChartOptions, chartColours } from '@/lib/chart-theme'

/**
 * Research chart text must be at least 14px and follow dark mode (C7b-24), without overriding a
 * colour or a larger size a chart chose itself.
 */

describe('themeChartOptions', () => {
  const options = {
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'GDD' },
      datalabels: { font: { size: 9, weight: 'bold' as const } },
    },
    scales: {
      y: { title: { display: true, text: 'GDD' } },
      y1: { ticks: { color: 'rgb(239, 68, 68)' }, title: { text: '°C', color: 'rgb(239, 68, 68)', font: { size: 18 } } },
    },
  }

  it('sets 14px text and theme colours on legend, title, value labels and axes', () => {
    const themed = themeChartOptions(options, true) as typeof options & Record<string, never>
    const { ink, grid } = chartColours(true)
    const plugins = themed.plugins as unknown as Record<string, { color?: string; font?: { size?: number; weight?: string }; labels?: { color?: string; font?: { size?: number } } }>
    expect(plugins.legend.labels?.font?.size).toBe(14)
    expect(plugins.legend.labels?.color).toBe(ink)
    expect(plugins.title.font?.size).toBe(14)
    expect(plugins.datalabels.font).toEqual({ size: 14, weight: 'bold' })
    const y = (themed.scales as unknown as Record<string, { ticks: { color: string; font: { size: number } }; grid: { color: string } }>).y
    expect(y.ticks).toEqual({ color: ink, font: { size: 14 } })
    expect(y.grid.color).toBe(grid)
  })

  it('keeps a colour or larger size the chart chose', () => {
    const themed = themeChartOptions(options, false)
    const y1 = (themed.scales as unknown as Record<string, { ticks: { color: string }; title: { color: string; font: { size: number } } }>).y1
    expect(y1.ticks.color).toBe('rgb(239, 68, 68)')
    expect(y1.title.color).toBe('rgb(239, 68, 68)')
    expect(y1.title.font.size).toBe(18)
  })

  it('leaves hidden value labels alone', () => {
    const themed = themeChartOptions({ plugins: { datalabels: { display: false } } }, false)
    expect((themed.plugins as { datalabels: unknown }).datalabels).toEqual({ display: false })
  })
})
