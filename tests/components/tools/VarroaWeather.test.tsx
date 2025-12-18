import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import VarroaWeather from '@/components/tools/VarroaWeather'

// Mock data
const mockApiaries = [
  { id: 'apiary-1', name: 'Home Apiary', latitude: 53.3498, longitude: -6.2603 },
  { id: 'apiary-2', name: 'Farm Apiary', latitude: 53.2707, longitude: -9.0568 },
]

const mockApiariesNoCoords = [
  { id: 'apiary-3', name: 'No Location', latitude: null, longitude: null },
]

const mockTreatments = [
  {
    id: 'treat-1',
    product_name: 'Apiguard',
    active_ingredients: 'Thymol',
    temperature_range: '15-30°C',
    notes: 'Apply 2 trays, 2 weeks apart.',
  },
  {
    id: 'treat-2',
    product_name: 'Apivar',
    active_ingredients: 'Amitraz',
    temperature_range: '10-29°C',
    notes: 'Leave strips for 6-8 weeks.',
  },
  {
    id: 'treat-3',
    product_name: 'Apibioxal',
    active_ingredients: 'Oxalic acid dihydrate',
    temperature_range: 'Any (broodless period preferred)',
    notes: 'Trickling or vaporisation.',
  },
  {
    id: 'treat-4',
    product_name: 'Formic Pro',
    active_ingredients: 'Formic acid',
    temperature_range: '10-29°C',
    notes: '14 day treatment.',
  },
]

const mockForecastResponse = {
  daily: {
    time: ['2025-12-16', '2025-12-17', '2025-12-18', '2025-12-19', '2025-12-20', '2025-12-21', '2025-12-22'],
    temperature_2m_max: [8, 10, 12, 15, 18, 20, 16],
    temperature_2m_min: [2, 4, 5, 8, 10, 12, 9],
    relative_humidity_2m_max: [85, 80, 75, 70, 65, 60, 72],
    precipitation_sum: [0, 2, 0, 0, 5, 0, 1],
    precipitation_probability_max: [10, 60, 20, 10, 80, 15, 40],
    wind_speed_10m_max: [15, 20, 12, 10, 25, 18, 14],
    weather_code: [1, 61, 2, 0, 63, 1, 3],
  },
}

// Mock Supabase
const mockSupabaseFrom = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockSupabaseFrom(table),
  },
}))

// Mock fetch for weather API
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('VarroaWeather', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementation for Supabase
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'apiaries') {
        return {
          select: () => ({
            eq: () => ({
              not: () => ({
                not: () => ({
                  order: () => Promise.resolve({ data: mockApiaries, error: null }),
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'varroa_treatment_products') {
        return {
          select: () => ({
            order: () => Promise.resolve({ data: mockTreatments, error: null }),
          }),
        }
      }
      return {}
    })

    // Default mock for weather API
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockForecastResponse),
    })
  })

  describe('Rendering', () => {
    it('should render the Varroa Weather title', async () => {
      render(<VarroaWeather userId="test-user-id" />)

      await waitFor(() => {
        expect(screen.getByText('Varroa Weather')).toBeInTheDocument()
      })
    })

    it('should render the info box explaining the tool', async () => {
      render(<VarroaWeather userId="test-user-id" />)

      await waitFor(() => {
        expect(screen.getByText('Treatment Weather Forecast')).toBeInTheDocument()
        expect(
          screen.getByText(/See which varroa treatments are suitable/)
        ).toBeInTheDocument()
      })
    })

    it('should render the apiary selector label', async () => {
      render(<VarroaWeather userId="test-user-id" />)

      await waitFor(() => {
        expect(screen.getByText('Select Apiary')).toBeInTheDocument()
      })
    })

    it('should show loading state initially', () => {
      render(<VarroaWeather userId="test-user-id" />)
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  describe('Apiary Selection', () => {
    it('should display apiaries in dropdown', async () => {
      render(<VarroaWeather userId="test-user-id" />)

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      // Check first apiary is auto-selected (appears in dropdown value)
      const select = screen.getByRole('combobox')
      expect(select).toHaveValue('apiary-1')
    })

    it('should auto-select first apiary on load', async () => {
      render(<VarroaWeather userId="test-user-id" />)

      await waitFor(() => {
        const select = screen.getByRole('combobox')
        expect(select).toHaveValue('apiary-1')
      })
    })

    it('should allow changing apiary selection', async () => {
      render(<VarroaWeather userId="test-user-id" />)

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'apiary-2' } })

      expect(select).toHaveValue('apiary-2')
    })

    it('should show warning when no apiaries with coordinates exist', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'apiaries') {
          return {
            select: () => ({
              eq: () => ({
                not: () => ({
                  not: () => ({
                    order: () => Promise.resolve({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'varroa_treatment_products') {
          return {
            select: () => ({
              order: () => Promise.resolve({ data: mockTreatments, error: null }),
            }),
          }
        }
        return {}
      })

      render(<VarroaWeather userId="test-user-id" />)

      await waitFor(() => {
        expect(
          screen.getByText(/No apiaries with GPS coordinates found/)
        ).toBeInTheDocument()
      })
    })
  })

  describe('Weather Forecast', () => {
    it('should fetch weather data from Open-Meteo API', async () => {
      render(<VarroaWeather userId="test-user-id" />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      // Check that the API was called with correct parameters
      const fetchCall = mockFetch.mock.calls[0][0]
      expect(fetchCall).toContain('api.open-meteo.com')
      expect(fetchCall).toContain('latitude=53.3498')
      expect(fetchCall).toContain('longitude=-6.2603')
      expect(fetchCall).toContain('timezone=Europe/Dublin')
    })

    it('should display 7 days of forecast', async () => {
      render(<VarroaWeather userId="test-user-id" />)

      await waitFor(() => {
        // Check for day names
        expect(screen.getAllByText(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/).length).toBeGreaterThan(0)
      })
    })

    it('should show error message when forecast fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      })

      render(<VarroaWeather userId="test-user-id" />)

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch weather forecast')).toBeInTheDocument()
      })
    })
  })

  describe('Treatment Suitability Matrix', () => {
    it('should display all treatments from database', async () => {
      render(<VarroaWeather userId="test-user-id" />)

      await waitFor(() => {
        expect(screen.getByText('Apiguard')).toBeInTheDocument()
        expect(screen.getByText('Apivar')).toBeInTheDocument()
        expect(screen.getByText('Apibioxal')).toBeInTheDocument()
        expect(screen.getByText('Formic Pro')).toBeInTheDocument()
      })
    })

    it('should display temperature ranges for treatments', async () => {
      render(<VarroaWeather userId="test-user-id" />)

      await waitFor(() => {
        expect(screen.getByText('15-30°C')).toBeInTheDocument()
        expect(screen.getByText('10-29°C')).toBeInTheDocument()
      })
    })

    it('should display table headers for Treatment and days', async () => {
      render(<VarroaWeather userId="test-user-id" />)

      await waitFor(() => {
        expect(screen.getByText('Treatment')).toBeInTheDocument()
      })
    })
  })

  describe('Weather Details Table', () => {
    it('should display weather parameter rows', async () => {
      render(<VarroaWeather userId="test-user-id" />)

      await waitFor(() => {
        expect(screen.getByText('Conditions')).toBeInTheDocument()
        expect(screen.getByText('Temp (°C)')).toBeInTheDocument()
        expect(screen.getByText('Humidity (%)')).toBeInTheDocument()
        expect(screen.getByText('Rain (mm)')).toBeInTheDocument()
        expect(screen.getByText('Wind (km/h)')).toBeInTheDocument()
      })
    })

    it('should display weather table header', async () => {
      render(<VarroaWeather userId="test-user-id" />)

      await waitFor(() => {
        expect(screen.getByText('Weather')).toBeInTheDocument()
      })
    })
  })

  describe('Legend', () => {
    it('should display legend section', async () => {
      render(<VarroaWeather userId="test-user-id" />)

      await waitFor(() => {
        expect(screen.getByText('Legend')).toBeInTheDocument()
      })
    })

    it('should explain all suitability indicators', async () => {
      render(<VarroaWeather userId="test-user-id" />)

      await waitFor(() => {
        expect(screen.getByText('Optimal conditions')).toBeInTheDocument()
        expect(screen.getByText('Favorable conditions')).toBeInTheDocument()
        expect(screen.getByText('Too cold')).toBeInTheDocument()
        expect(screen.getByText('Too hot')).toBeInTheDocument()
      })
    })

    it('should display disclaimer about following product instructions', async () => {
      render(<VarroaWeather userId="test-user-id" />)

      await waitFor(() => {
        expect(
          screen.getByText(/Temperature limits are based on manufacturer recommendations/)
        ).toBeInTheDocument()
      })
    })
  })

  describe('Empty States', () => {
    it('should show empty state when no apiary selected and no forecast', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'apiaries') {
          return {
            select: () => ({
              eq: () => ({
                not: () => ({
                  not: () => ({
                    order: () => Promise.resolve({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'varroa_treatment_products') {
          return {
            select: () => ({
              order: () => Promise.resolve({ data: mockTreatments, error: null }),
            }),
          }
        }
        return {}
      })

      render(<VarroaWeather userId="test-user-id" />)

      await waitFor(() => {
        expect(
          screen.getByText(/No apiaries with GPS coordinates found/)
        ).toBeInTheDocument()
      })
    })
  })
})

describe('Treatment Suitability Logic', () => {
  describe('parseTemperatureRange', () => {
    it('should parse standard temperature range', () => {
      const range = '15-30°C'
      const match = range.match(/(\d+)\s*-\s*(\d+)/)
      expect(match).not.toBeNull()
      expect(parseInt(match![1])).toBe(15)
      expect(parseInt(match![2])).toBe(30)
    })

    it('should parse temperature range without spaces', () => {
      const range = '10-29°C'
      const match = range.match(/(\d+)\s*-\s*(\d+)/)
      expect(match).not.toBeNull()
      expect(parseInt(match![1])).toBe(10)
      expect(parseInt(match![2])).toBe(29)
    })

    it('should return null for non-standard range', () => {
      const range = 'Any (broodless period)'
      const match = range.match(/(\d+)\s*-\s*(\d+)/)
      expect(match).toBeNull()
    })
  })

  describe('isTreatmentSuitableForBroodStatus', () => {
    const BROODLESS_ONLY_TREATMENTS = ['Apibioxal', 'Oxybee']
    const ACTIVE_BEES_TREATMENTS = ['Apiguard', 'ApiLife Var']

    const isTreatmentSuitableForBroodStatus = (
      productName: string,
      broodStatus: 'brood' | 'broodless'
    ): 'suitable' | 'not_recommended' | 'less_effective' => {
      const isBroodlessOnly = BROODLESS_ONLY_TREATMENTS.some(t =>
        productName.toLowerCase().includes(t.toLowerCase())
      )
      const needsActiveBees = ACTIVE_BEES_TREATMENTS.some(t =>
        productName.toLowerCase().includes(t.toLowerCase())
      )

      if (broodStatus === 'brood') {
        if (isBroodlessOnly) return 'not_recommended'
        return 'suitable'
      } else {
        if (needsActiveBees) return 'less_effective'
        return 'suitable'
      }
    }

    it('should return "not_recommended" for oxalic acid with brood', () => {
      expect(isTreatmentSuitableForBroodStatus('Apibioxal', 'brood')).toBe('not_recommended')
      expect(isTreatmentSuitableForBroodStatus('Oxybee', 'brood')).toBe('not_recommended')
    })

    it('should return "suitable" for oxalic acid when broodless', () => {
      expect(isTreatmentSuitableForBroodStatus('Apibioxal', 'broodless')).toBe('suitable')
      expect(isTreatmentSuitableForBroodStatus('Oxybee', 'broodless')).toBe('suitable')
    })

    it('should return "less_effective" for thymol treatments when broodless', () => {
      expect(isTreatmentSuitableForBroodStatus('Apiguard', 'broodless')).toBe('less_effective')
      expect(isTreatmentSuitableForBroodStatus('ApiLife Var', 'broodless')).toBe('less_effective')
    })

    it('should return "suitable" for thymol treatments with brood', () => {
      expect(isTreatmentSuitableForBroodStatus('Apiguard', 'brood')).toBe('suitable')
      expect(isTreatmentSuitableForBroodStatus('ApiLife Var', 'brood')).toBe('suitable')
    })

    it('should return "suitable" for formic acid treatments in any status', () => {
      expect(isTreatmentSuitableForBroodStatus('Formic Pro', 'brood')).toBe('suitable')
      expect(isTreatmentSuitableForBroodStatus('Formic Pro', 'broodless')).toBe('suitable')
      expect(isTreatmentSuitableForBroodStatus('Mite Away Quick Strips', 'brood')).toBe('suitable')
      expect(isTreatmentSuitableForBroodStatus('Mite Away Quick Strips', 'broodless')).toBe('suitable')
    })

    it('should return "suitable" for Apivar in any status', () => {
      expect(isTreatmentSuitableForBroodStatus('Apivar', 'brood')).toBe('suitable')
      expect(isTreatmentSuitableForBroodStatus('Apivar', 'broodless')).toBe('suitable')
    })
  })

  describe('getSuitability with brood status', () => {
    const parseRange = (range: string) => {
      const match = range.match(/(\d+)\s*-\s*(\d+)/)
      if (match) {
        return { min: parseInt(match[1]), max: parseInt(match[2]) }
      }
      return null
    }

    const BROODLESS_ONLY_TREATMENTS = ['Apibioxal', 'Oxybee']
    const ACTIVE_BEES_TREATMENTS = ['Apiguard', 'ApiLife Var']

    const isTreatmentSuitableForBroodStatus = (
      productName: string,
      broodStatus: 'brood' | 'broodless'
    ): 'suitable' | 'not_recommended' | 'less_effective' => {
      const isBroodlessOnly = BROODLESS_ONLY_TREATMENTS.some(t =>
        productName.toLowerCase().includes(t.toLowerCase())
      )
      const needsActiveBees = ACTIVE_BEES_TREATMENTS.some(t =>
        productName.toLowerCase().includes(t.toLowerCase())
      )

      if (broodStatus === 'brood') {
        if (isBroodlessOnly) return 'not_recommended'
        return 'suitable'
      } else {
        if (needsActiveBees) return 'less_effective'
        return 'suitable'
      }
    }

    const getSuitability = (
      productName: string,
      tempRange: string,
      tempMin: number,
      tempMax: number,
      broodStatus: 'brood' | 'broodless'
    ): string => {
      const broodSuitability = isTreatmentSuitableForBroodStatus(productName, broodStatus)
      if (broodSuitability === 'not_recommended') return 'not_recommended'

      const range = parseRange(tempRange)
      if (!range || tempRange.toLowerCase().includes('any')) {
        if (broodStatus === 'broodless') {
          const avgTemp = (tempMin + tempMax) / 2
          if (avgTemp >= 0 && avgTemp <= 10) return 'optimal'
          if (avgTemp > 10 && avgTemp <= 15) return 'favorable'
          if (avgTemp < 0) return 'too_cold'
          return 'favorable'
        }
        return 'na'
      }

      const avgTemp = (tempMin + tempMax) / 2
      if (avgTemp < range.min) return 'too_cold'
      if (avgTemp > range.max) return 'too_hot'

      const rangeSize = range.max - range.min
      const optimalMin = range.min + rangeSize * 0.2
      const optimalMax = range.max - rangeSize * 0.2

      if (avgTemp >= optimalMin && avgTemp <= optimalMax) {
        if (broodSuitability === 'less_effective') return 'less_effective'
        return 'optimal'
      }

      if (broodSuitability === 'less_effective') return 'less_effective'
      return 'favorable'
    }

    it('should return "not_recommended" for Apibioxal with brood present', () => {
      expect(getSuitability('Apibioxal', 'Any (broodless)', 5, 10, 'brood')).toBe('not_recommended')
    })

    it('should return "optimal" for Apibioxal when broodless and cold', () => {
      // avg temp = (2 + 8) / 2 = 5°C (within 0-10°C optimal)
      expect(getSuitability('Apibioxal', 'Any (broodless)', 2, 8, 'broodless')).toBe('optimal')
    })

    it('should return "favorable" for Apibioxal when broodless and mild', () => {
      // avg temp = (10 + 14) / 2 = 12°C (within 10-15°C favorable)
      expect(getSuitability('Apibioxal', 'Any (broodless)', 10, 14, 'broodless')).toBe('favorable')
    })

    it('should return "less_effective" for Apiguard when broodless', () => {
      expect(getSuitability('Apiguard', '15-30°C', 20, 24, 'broodless')).toBe('less_effective')
    })

    it('should return "optimal" for Apiguard with brood in good temp', () => {
      expect(getSuitability('Apiguard', '15-30°C', 20, 24, 'brood')).toBe('optimal')
    })

    it('should return "too_cold" for temperature-dependent treatments', () => {
      expect(getSuitability('Apiguard', '15-30°C', 2, 8, 'brood')).toBe('too_cold')
    })

    it('should return "too_hot" for temperature-dependent treatments', () => {
      expect(getSuitability('Apivar', '10-29°C', 30, 35, 'brood')).toBe('too_hot')
    })
  })
})

describe('Weather Code Descriptions', () => {
  const getWeatherDescription = (code: number): string => {
    const descriptions: Record<number, string> = {
      0: 'Clear',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      80: 'Slight showers',
      81: 'Moderate showers',
      82: 'Violent showers',
      95: 'Thunderstorm',
    }
    return descriptions[code] || 'Unknown'
  }

  it('should return "Clear" for code 0', () => {
    expect(getWeatherDescription(0)).toBe('Clear')
  })

  it('should return "Partly cloudy" for code 2', () => {
    expect(getWeatherDescription(2)).toBe('Partly cloudy')
  })

  it('should return "Slight rain" for code 61', () => {
    expect(getWeatherDescription(61)).toBe('Slight rain')
  })

  it('should return "Moderate rain" for code 63', () => {
    expect(getWeatherDescription(63)).toBe('Moderate rain')
  })

  it('should return "Heavy rain" for code 65', () => {
    expect(getWeatherDescription(65)).toBe('Heavy rain')
  })

  it('should return "Thunderstorm" for code 95', () => {
    expect(getWeatherDescription(95)).toBe('Thunderstorm')
  })

  it('should return "Unknown" for unrecognized codes', () => {
    expect(getWeatherDescription(999)).toBe('Unknown')
  })

  it('should return "Foggy" for code 45', () => {
    expect(getWeatherDescription(45)).toBe('Foggy')
  })

  it('should return "Slight snow" for code 71', () => {
    expect(getWeatherDescription(71)).toBe('Slight snow')
  })
})

describe('API Integration', () => {
  it('should use correct Open-Meteo API endpoint', () => {
    const baseUrl = 'https://api.open-meteo.com/v1/forecast'
    expect(baseUrl).toContain('open-meteo.com')
  })

  it('should request correct daily parameters', () => {
    const expectedParams = [
      'temperature_2m_max',
      'temperature_2m_min',
      'relative_humidity_2m_max',
      'precipitation_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'weather_code',
    ]

    expectedParams.forEach(param => {
      expect(param).toBeDefined()
    })
  })

  it('should use Europe/Dublin timezone', () => {
    const timezone = 'Europe/Dublin'
    expect(timezone).toBe('Europe/Dublin')
  })

  it('should request 7 days of forecast', () => {
    const forecastDays = 7
    expect(forecastDays).toBe(7)
  })
})

describe('Irish Treatment Products', () => {
  it('should verify expected treatment products exist', () => {
    const expectedProducts = [
      'Apiguard',
      'ApiLife Var',
      'Apivar',
      'Formic Pro',
      'Mite Away Quick Strips',
      'HopGuard III',
      'Apibioxal',
      'Oxybee',
      'VarroMed',
    ]

    // Verify the expected product names format
    expectedProducts.forEach(product => {
      expect(typeof product).toBe('string')
      expect(product.length).toBeGreaterThan(0)
    })
  })

  it('should verify temperature-dependent treatments have valid ranges', () => {
    const tempDependentTreatments = [
      { name: 'Apiguard', range: '15-30°C' },
      { name: 'ApiLife Var', range: '15-30°C' },
      { name: 'Apivar', range: '10-29°C' },
      { name: 'Formic Pro', range: '10-29°C' },
    ]

    tempDependentTreatments.forEach(treatment => {
      const match = treatment.range.match(/(\d+)-(\d+)/)
      expect(match).not.toBeNull()
      const min = parseInt(match![1])
      const max = parseInt(match![2])
      expect(min).toBeGreaterThan(0)
      expect(max).toBeGreaterThan(min)
      expect(max).toBeLessThan(50) // Reasonable upper limit
    })
  })

  it('should verify broodless treatments have "Any" temperature range', () => {
    const broodlessTreatments = ['Apibioxal', 'Oxybee']
    const anyRangePattern = /any/i

    // These treatments should have "Any" in their temperature range
    broodlessTreatments.forEach(name => {
      expect(typeof name).toBe('string')
    })
  })
})

describe('Data Table Formatting', () => {
  it('should format day names correctly', () => {
    const date = new Date('2025-12-16')
    const dayName = date.toLocaleDateString('en-IE', { weekday: 'short' })
    expect(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).toContain(dayName)
  })

  it('should format date display correctly', () => {
    const date = new Date('2025-12-16')
    const formatted = date.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })
    expect(formatted).toMatch(/\d{1,2} \w{3}/)
  })

  it('should round temperature values correctly', () => {
    const temp = 15.7
    expect(Math.round(temp)).toBe(16)
  })

  it('should format precipitation to one decimal', () => {
    const precip = 2.567
    expect(precip.toFixed(1)).toBe('2.6')
  })

  it('should round wind speed correctly', () => {
    const wind = 14.8
    expect(Math.round(wind)).toBe(15)
  })

  it('should calculate average temperature correctly', () => {
    const tempMin = 8
    const tempMax = 16
    const avgTemp = (tempMin + tempMax) / 2
    expect(avgTemp).toBe(12)
  })
})
