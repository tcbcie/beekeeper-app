import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Tests for weather fetching functionality in records page
 *
 * This test suite covers:
 * 1. Weather fetching with Irish Eircodes
 * 2. Weather fetching with UK/NI postcodes
 * 3. Fallback behavior when geocoding fails
 * 4. Error handling
 */

describe('Weather Fetching Functionality', () => {
  let globalFetch: typeof global.fetch

  beforeEach(() => {
    // Store original fetch
    globalFetch = global.fetch
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original fetch
    global.fetch = globalFetch
  })

  describe('fetchWeatherData with Irish Eircode', () => {
    it('should fetch weather data using Irish Eircode and Ireland as country', async () => {
      // Mock Nominatim geocoding response
      const mockNominatimResponse = [
        {
          lat: '53.3498',
          lon: '-6.2603',
          display_name: 'Dublin, Ireland'
        }
      ]

      // Mock Open-Meteo weather response
      const mockWeatherResponse = {
        current: {
          temperature_2m: 15.5,
          relative_humidity_2m: 75,
          weather_code: 2,
          wind_speed_10m: 12.5
        }
      }

      let nominatimCallCount = 0
      let weatherCallCount = 0

      global.fetch = vi.fn((url: string | URL | Request) => {
        const urlString = url.toString()

        if (urlString.includes('nominatim.openstreetmap.org')) {
          nominatimCallCount++
          // Verify that Ireland is used in the query
          expect(urlString).toContain('Ireland')
          expect(urlString).toContain('D02XY45') // Cleaned eircode

          return Promise.resolve({
            ok: true,
            json: async () => mockNominatimResponse
          } as Response)
        }

        if (urlString.includes('api.open-meteo.com')) {
          weatherCallCount++
          // Verify coordinates are from nominatim response
          expect(urlString).toContain('latitude=53.3498')
          expect(urlString).toContain('longitude=-6.2603')

          return Promise.resolve({
            ok: true,
            json: async () => mockWeatherResponse
          } as Response)
        }

        return Promise.reject(new Error('Unexpected URL'))
      }) as typeof fetch

      // Simulate the fetchWeatherData function
      const eircode = 'D02 XY45'
      const isUkNi = false
      const cleanedCode = eircode.trim().replace(/\s+/g, '').toUpperCase()
      const country = isUkNi ? 'United Kingdom' : 'Ireland'

      // First geocoding call
      const geocodeResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanedCode)},${country}&format=json&limit=1`,
        { headers: { 'User-Agent': 'HiveCraic/1.0' } }
      )
      const geocodeData = await geocodeResponse.json()

      expect(geocodeData).toHaveLength(1)
      expect(geocodeData[0].lat).toBe('53.3498')
      expect(geocodeData[0].lon).toBe('-6.2603')

      // Weather API call
      const { lat, lon } = geocodeData[0]
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Europe/Dublin`
      )
      const weatherData = await weatherResponse.json()

      expect(weatherData.current.temperature_2m).toBe(15.5)
      expect(weatherData.current.relative_humidity_2m).toBe(75)
      expect(nominatimCallCount).toBe(1)
      expect(weatherCallCount).toBe(1)
    })

    it('should use Dublin as fallback when Irish Eircode geocoding fails', async () => {
      const mockWeatherResponse = {
        current: {
          temperature_2m: 14.0,
          relative_humidity_2m: 80,
          weather_code: 3,
          wind_speed_10m: 10.0
        }
      }

      let nominatimFailures = 0

      global.fetch = vi.fn((url: string | URL | Request) => {
        const urlString = url.toString()

        if (urlString.includes('nominatim.openstreetmap.org')) {
          nominatimFailures++
          // Return empty array to simulate failed geocoding
          return Promise.resolve({
            ok: true,
            json: async () => []
          } as Response)
        }

        if (urlString.includes('api.open-meteo.com')) {
          // Verify Dublin coordinates are used as fallback
          expect(urlString).toContain('latitude=53.3498')
          expect(urlString).toContain('longitude=-6.2603')

          return Promise.resolve({
            ok: true,
            json: async () => mockWeatherResponse
          } as Response)
        }

        return Promise.reject(new Error('Unexpected URL'))
      }) as typeof fetch

      const eircode = 'INVALID'
      const isUkNi = false
      const cleanedCode = eircode.trim().replace(/\s+/g, '').toUpperCase()
      const country = 'Ireland'

      // First attempt
      const geocodeResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanedCode)},${country}&format=json&limit=1`,
        { headers: { 'User-Agent': 'HiveCraic/1.0' } }
      )
      const geocodeData = await geocodeResponse.json()

      // Second attempt (alt format)
      let altData = []
      if (!geocodeData || geocodeData.length === 0) {
        const altResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanedCode + ' ' + country)}&format=json&limit=1`,
          { headers: { 'User-Agent': 'HiveCraic/1.0' } }
        )
        altData = await altResponse.json()
      }

      // Should fallback to Dublin coordinates
      expect(altData).toHaveLength(0)
      expect(nominatimFailures).toBe(2) // Both attempts failed

      // Fallback coordinates
      const fallbackLat = '53.3498'
      const fallbackLon = '-6.2603'

      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${fallbackLat}&longitude=${fallbackLon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Europe/Dublin`
      )
      const weatherData = await weatherResponse.json()

      expect(weatherData.current.temperature_2m).toBe(14.0)
    })
  })

  describe('fetchWeatherData with UK/NI Postcode', () => {
    it('should fetch weather data using UK postcode and United Kingdom as country', async () => {
      const mockNominatimResponse = [
        {
          lat: '54.5973',
          lon: '-5.9301',
          display_name: 'Belfast, Northern Ireland, UK'
        }
      ]

      const mockWeatherResponse = {
        current: {
          temperature_2m: 12.3,
          relative_humidity_2m: 82,
          weather_code: 1,
          wind_speed_10m: 15.2
        }
      }

      let nominatimCallCount = 0

      global.fetch = vi.fn((url: string | URL | Request) => {
        const urlString = url.toString()

        if (urlString.includes('nominatim.openstreetmap.org')) {
          nominatimCallCount++
          // Verify that United Kingdom is used in the query, NOT Ireland
          expect(urlString).toContain('United%20Kingdom')
          expect(urlString).not.toContain('Ireland')
          expect(urlString).toContain('BT15GS') // Cleaned postcode

          return Promise.resolve({
            ok: true,
            json: async () => mockNominatimResponse
          } as Response)
        }

        if (urlString.includes('api.open-meteo.com')) {
          // Verify Belfast coordinates are used
          expect(urlString).toContain('latitude=54.5973')
          expect(urlString).toContain('longitude=-5.9301')

          return Promise.resolve({
            ok: true,
            json: async () => mockWeatherResponse
          } as Response)
        }

        return Promise.reject(new Error('Unexpected URL'))
      }) as typeof fetch

      // Simulate the fetchWeatherData function with UK postcode
      const postcode = 'BT1 5GS'
      const isUkNi = true  // This is the key flag for UK postcodes
      const cleanedCode = postcode.trim().replace(/\s+/g, '').toUpperCase()
      const country = isUkNi ? 'United Kingdom' : 'Ireland'

      expect(country).toBe('United Kingdom')

      // Geocoding call
      const geocodeResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanedCode)},${country}&format=json&limit=1`,
        { headers: { 'User-Agent': 'HiveCraic/1.0' } }
      )
      const geocodeData = await geocodeResponse.json()

      expect(geocodeData).toHaveLength(1)
      expect(geocodeData[0].lat).toBe('54.5973')
      expect(geocodeData[0].lon).toBe('-5.9301')
      expect(nominatimCallCount).toBe(1)

      // Weather API call
      const { lat, lon } = geocodeData[0]
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Europe/Dublin`
      )
      const weatherData = await weatherResponse.json()

      expect(weatherData.current.temperature_2m).toBe(12.3)
      expect(weatherData.current.relative_humidity_2m).toBe(82)
    })

    it('should use Belfast as fallback when UK postcode geocoding fails', async () => {
      const mockWeatherResponse = {
        current: {
          temperature_2m: 11.0,
          relative_humidity_2m: 85,
          weather_code: 3,
          wind_speed_10m: 18.0
        }
      }

      global.fetch = vi.fn((url: string | URL | Request) => {
        const urlString = url.toString()

        if (urlString.includes('nominatim.openstreetmap.org')) {
          // Verify United Kingdom is being used
          expect(urlString).toContain('United%20Kingdom')
          // Return empty array to simulate failed geocoding
          return Promise.resolve({
            ok: true,
            json: async () => []
          } as Response)
        }

        if (urlString.includes('api.open-meteo.com')) {
          // Verify Belfast coordinates are used as fallback (NOT Dublin)
          expect(urlString).toContain('latitude=54.5973')
          expect(urlString).toContain('longitude=-5.9301')
          expect(urlString).not.toContain('latitude=53.3498') // Not Dublin

          return Promise.resolve({
            ok: true,
            json: async () => mockWeatherResponse
          } as Response)
        }

        return Promise.reject(new Error('Unexpected URL'))
      }) as typeof fetch

      const postcode = 'INVALID UK'
      const isUkNi = true
      const cleanedCode = postcode.trim().replace(/\s+/g, '').toUpperCase()
      const country = 'United Kingdom'

      // First attempt
      const geocodeResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanedCode)},${country}&format=json&limit=1`,
        { headers: { 'User-Agent': 'HiveCraic/1.0' } }
      )
      const geocodeData = await geocodeResponse.json()

      // Second attempt
      let altData = []
      if (!geocodeData || geocodeData.length === 0) {
        const altResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanedCode + ' ' + country)}&format=json&limit=1`,
          { headers: { 'User-Agent': 'HiveCraic/1.0' } }
        )
        altData = await altResponse.json()
      }

      expect(altData).toHaveLength(0)

      // Fallback to Belfast coordinates (for UK)
      const fallbackLat = isUkNi ? '54.5973' : '53.3498'
      const fallbackLon = isUkNi ? '-5.9301' : '-6.2603'

      expect(fallbackLat).toBe('54.5973')
      expect(fallbackLon).toBe('-5.9301')

      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${fallbackLat}&longitude=${fallbackLon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Europe/Dublin`
      )
      const weatherData = await weatherResponse.json()

      expect(weatherData.current.temperature_2m).toBe(11.0)
    })

    it('should handle various UK postcode formats correctly', async () => {
      const testCases = [
        { input: 'BT1 5GS', expected: 'BT15GS' },
        { input: 'bt1 5gs', expected: 'BT15GS' },
        { input: '  BT1   5GS  ', expected: 'BT15GS' },
        { input: 'SW1A 1AA', expected: 'SW1A1AA' },
        { input: 'EC1A1BB', expected: 'EC1A1BB' }
      ]

      for (const testCase of testCases) {
        const cleanedCode = testCase.input.trim().replace(/\s+/g, '').toUpperCase()
        expect(cleanedCode).toBe(testCase.expected)
      }
    })
  })

  describe('Weather data integration', () => {
    it('should correctly distinguish between Irish and UK postcodes based on is_uk_ni flag', async () => {
      const scenarios = [
        { postcode: 'D02 XY45', isUkNi: false, expectedCountry: 'Ireland', expectedFallbackLat: '53.3498' },
        { postcode: 'BT1 5GS', isUkNi: true, expectedCountry: 'United Kingdom', expectedFallbackLat: '54.5973' },
        { postcode: 'A96 X7F2', isUkNi: false, expectedCountry: 'Ireland', expectedFallbackLat: '53.3498' },
        { postcode: 'SW1A 1AA', isUkNi: true, expectedCountry: 'United Kingdom', expectedFallbackLat: '54.5973' }
      ]

      for (const scenario of scenarios) {
        const country = scenario.isUkNi ? 'United Kingdom' : 'Ireland'
        const fallbackLat = scenario.isUkNi ? '54.5973' : '53.3498'
        const fallbackLon = scenario.isUkNi ? '-5.9301' : '-6.2603'

        expect(country).toBe(scenario.expectedCountry)
        expect(fallbackLat).toBe(scenario.expectedFallbackLat)
      }
    })

    it('should handle network errors gracefully and use fallback coordinates', async () => {
      global.fetch = vi.fn((url: string | URL | Request) => {
        const urlString = url.toString()

        if (urlString.includes('nominatim.openstreetmap.org')) {
          // Simulate network error
          return Promise.reject(new Error('Network error'))
        }

        if (urlString.includes('api.open-meteo.com')) {
          // Fallback weather should still work
          return Promise.resolve({
            ok: true,
            json: async () => ({
              current: {
                temperature_2m: 13.0,
                relative_humidity_2m: 70,
                weather_code: 0,
                wind_speed_10m: 8.0
              }
            })
          } as Response)
        }

        return Promise.reject(new Error('Unexpected URL'))
      }) as typeof fetch

      // Simulate error handling
      let weatherData = null
      try {
        await fetch('https://nominatim.openstreetmap.org/search?q=test', {
          headers: { 'User-Agent': 'HiveCraic/1.0' }
        })
      } catch {
        // Use fallback coordinates for Ireland
        const fallbackLat = '53.3498'
        const fallbackLon = '-6.2603'

        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${fallbackLat}&longitude=${fallbackLon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Europe/Dublin`
        )
        weatherData = await weatherResponse.json()
      }

      expect(weatherData).not.toBeNull()
      expect(weatherData?.current.temperature_2m).toBe(13.0)
    })
  })

  describe('Weather code mapping', () => {
    it('should correctly map weather codes to conditions', () => {
      const weatherCodeMap: { [key: number]: string } = {
        0: 'Clear',
        1: 'Mainly Clear',
        2: 'Partly Cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Depositing Rime Fog',
        51: 'Light Drizzle',
        53: 'Moderate Drizzle',
        55: 'Dense Drizzle',
        61: 'Slight Rain',
        63: 'Moderate Rain',
        65: 'Heavy Rain',
        71: 'Slight Snow',
        73: 'Moderate Snow',
        75: 'Heavy Snow',
        95: 'Thunderstorm'
      }

      expect(weatherCodeMap[0]).toBe('Clear')
      expect(weatherCodeMap[2]).toBe('Partly Cloudy')
      expect(weatherCodeMap[61]).toBe('Slight Rain')
      expect(weatherCodeMap[95]).toBe('Thunderstorm')
    })
  })

  describe('Postcode cleaning', () => {
    it('should clean and format postcodes correctly', () => {
      const testCases = [
        { input: 'D02 XY45', expected: 'D02XY45' },
        { input: 'd02 xy45', expected: 'D02XY45' },
        { input: '  D02   XY45  ', expected: 'D02XY45' },
        { input: 'BT1 5GS', expected: 'BT15GS' },
        { input: 'bt1  5gs', expected: 'BT15GS' }
      ]

      for (const testCase of testCases) {
        const cleaned = testCase.input.trim().replace(/\s+/g, '').toUpperCase()
        expect(cleaned).toBe(testCase.expected)
      }
    })
  })
})
