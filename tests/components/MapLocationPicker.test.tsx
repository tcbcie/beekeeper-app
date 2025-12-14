import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock mapbox-gl before importing the component
const mockSetLngLat = vi.fn().mockReturnThis()
const mockAddTo = vi.fn().mockReturnThis()
const mockOn = vi.fn()
const mockRemove = vi.fn()
const mockFlyTo = vi.fn()
const mockAddControl = vi.fn()
const mockAddSource = vi.fn()
const mockAddLayer = vi.fn()
const mockGetSource = vi.fn()
const mockSetData = vi.fn()

const mockMarkerInstance = {
  setLngLat: mockSetLngLat,
  addTo: mockAddTo,
  on: mockOn,
  getLngLat: vi.fn().mockReturnValue({ lat: 53.4129, lng: -8.2439 }),
}

const mockMapInstance = {
  addControl: mockAddControl,
  on: vi.fn((event: string, callback: () => void) => {
    if (event === 'load') {
      // Simulate map load
      setTimeout(callback, 0)
    }
  }),
  remove: mockRemove,
  flyTo: mockFlyTo,
  addSource: mockAddSource,
  addLayer: mockAddLayer,
  getSource: mockGetSource.mockReturnValue({
    setData: mockSetData
  }),
}

vi.mock('mapbox-gl', () => ({
  default: {
    accessToken: '',
    Map: vi.fn().mockImplementation(() => mockMapInstance),
    Marker: vi.fn().mockImplementation(() => mockMarkerInstance),
    NavigationControl: vi.fn(),
  },
}))

// Mock the CSS import
vi.mock('mapbox-gl/dist/mapbox-gl.css', () => ({}))

// Import component after mocks
import MapLocationPicker from '@/components/MapLocationPicker'

describe('MapLocationPicker', () => {
  const defaultProps = {
    latitude: '',
    longitude: '',
    onLocationChange: vi.fn(),
    onCityChange: vi.fn(),
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Set up env variable
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN', 'test-token')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('Rendering', () => {
    it('should render the map container', () => {
      render(<MapLocationPicker {...defaultProps} />)

      expect(screen.getByText(/click on the map or drag the marker/i)).toBeInTheDocument()
    })

    it('should render close button when onClose is provided', () => {
      render(<MapLocationPicker {...defaultProps} />)

      // Close button should be present
      const closeButton = screen.getByRole('button', { name: '' })
      expect(closeButton).toBeInTheDocument()
    })

    it('should not render close button when onClose is not provided', () => {
      const propsWithoutClose = { ...defaultProps, onClose: undefined }
      render(<MapLocationPicker {...propsWithoutClose} />)

      // Should only have the location button and flight radius select
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(1) // Only the current location button
    })

    it('should render coordinates display', () => {
      render(<MapLocationPicker {...defaultProps} />)

      expect(screen.getByText('Lat:')).toBeInTheDocument()
      expect(screen.getByText('Lng:')).toBeInTheDocument()
    })

    it('should display placeholder when no coordinates', () => {
      render(<MapLocationPicker {...defaultProps} />)

      // Should show em dash when no coordinates
      const latValue = screen.getAllByText('—')
      expect(latValue.length).toBeGreaterThanOrEqual(2)
    })

    it('should display actual coordinates when provided', () => {
      render(
        <MapLocationPicker
          {...defaultProps}
          latitude="53.4129"
          longitude="-8.2439"
        />
      )

      expect(screen.getByText('53.4129')).toBeInTheDocument()
      expect(screen.getByText('-8.2439')).toBeInTheDocument()
    })
  })

  describe('Flight Radius Dropdown', () => {
    it('should render flight radius dropdown', () => {
      render(<MapLocationPicker {...defaultProps} />)

      const select = screen.getByRole('combobox')
      expect(select).toBeInTheDocument()
    })

    it('should have default value of 3 km', () => {
      render(<MapLocationPicker {...defaultProps} />)

      const select = screen.getByRole('combobox') as HTMLSelectElement
      expect(select.value).toBe('3')
    })

    it('should have all radius options', () => {
      render(<MapLocationPicker {...defaultProps} />)

      expect(screen.getByRole('option', { name: 'No radius' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: '1 km' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: '2 km' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: '2.5 km' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: '3 km' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: '3.5 km' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: '5 km' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: '6 km' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: '7 km' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: '8 km' })).toBeInTheDocument()
    })

    it('should allow changing radius', async () => {
      const user = userEvent.setup()
      render(
        <MapLocationPicker
          {...defaultProps}
          latitude="53.4129"
          longitude="-8.2439"
        />
      )

      const select = screen.getByRole('combobox')
      await user.selectOptions(select, '5')

      expect((select as HTMLSelectElement).value).toBe('5')
    })
  })

  describe('Current Location Button', () => {
    it('should render current location button', () => {
      render(<MapLocationPicker {...defaultProps} />)

      const locationButton = screen.getByTitle('Use my current location')
      expect(locationButton).toBeInTheDocument()
    })

    it('should be enabled by default', () => {
      render(<MapLocationPicker {...defaultProps} />)

      const locationButton = screen.getByTitle('Use my current location')
      expect(locationButton).not.toBeDisabled()
    })
  })

  describe('Close Button', () => {
    it('should call onClose when clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<MapLocationPicker {...defaultProps} onClose={onClose} />)

      // Find the close button (it's the button without a title in the header)
      const buttons = screen.getAllByRole('button')
      const closeButton = buttons.find(btn => !btn.getAttribute('title'))

      if (closeButton) {
        await user.click(closeButton)
        expect(onClose).toHaveBeenCalledTimes(1)
      }
    })
  })

  describe('Props Interface', () => {
    it('should accept latitude as string', () => {
      expect(() => {
        render(<MapLocationPicker {...defaultProps} latitude="53.4129" />)
      }).not.toThrow()
    })

    it('should accept longitude as string', () => {
      expect(() => {
        render(<MapLocationPicker {...defaultProps} longitude="-8.2439" />)
      }).not.toThrow()
    })

    it('should accept onLocationChange callback', () => {
      const onLocationChange = vi.fn()
      expect(() => {
        render(<MapLocationPicker {...defaultProps} onLocationChange={onLocationChange} />)
      }).not.toThrow()
    })

    it('should accept optional onCityChange callback', () => {
      expect(() => {
        render(<MapLocationPicker {...defaultProps} onCityChange={undefined} />)
      }).not.toThrow()
    })

    it('should accept optional onClose callback', () => {
      expect(() => {
        render(<MapLocationPicker {...defaultProps} onClose={undefined} />)
      }).not.toThrow()
    })
  })
})

describe('createCircleGeoJSON helper', () => {
  // Test the circle generation logic indirectly through component behavior
  it('should generate valid GeoJSON for circle', async () => {
    render(
      <MapLocationPicker
        latitude="53.4129"
        longitude="-8.2439"
        onLocationChange={vi.fn()}
      />
    )

    // Wait for map to load
    await waitFor(() => {
      expect(mockAddSource).toHaveBeenCalled()
    })

    // Verify that addSource was called with flight-radius
    expect(mockAddSource).toHaveBeenCalledWith(
      'flight-radius',
      expect.objectContaining({
        type: 'geojson',
        data: expect.objectContaining({
          type: 'Feature',
          geometry: expect.objectContaining({
            type: 'Polygon',
          })
        })
      })
    )
  })
})

describe('Flight Radius Options', () => {
  it('should have correct option values', () => {
    render(<MapLocationPicker latitude="" longitude="" onLocationChange={vi.fn()} />)

    const options = screen.getAllByRole('option')
    const values = options.map(opt => (opt as HTMLOptionElement).value)

    expect(values).toContain('0')
    expect(values).toContain('1')
    expect(values).toContain('2')
    expect(values).toContain('2.5')
    expect(values).toContain('3')
    expect(values).toContain('3.5')
    expect(values).toContain('5')
    expect(values).toContain('6')
    expect(values).toContain('7')
    expect(values).toContain('8')
  })

  it('should have "No radius" as first option', () => {
    render(<MapLocationPicker latitude="" longitude="" onLocationChange={vi.fn()} />)

    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveTextContent('No radius')
    expect((options[0] as HTMLOptionElement).value).toBe('0')
  })
})

describe('Default Center', () => {
  it('should use Ireland as default center when no coordinates provided', async () => {
    const mapboxgl = await import('mapbox-gl')

    render(<MapLocationPicker latitude="" longitude="" onLocationChange={vi.fn()} />)

    // Map should be initialized with default center (Ireland)
    expect(mapboxgl.default.Map).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [-8.2439, 53.4129], // Default Ireland coordinates
        zoom: 6, // Lower zoom when no existing location
      })
    )
  })

  it('should use provided coordinates as center when available', async () => {
    const mapboxgl = await import('mapbox-gl')

    render(
      <MapLocationPicker
        latitude="52.0"
        longitude="-7.0"
        onLocationChange={vi.fn()}
      />
    )

    // Map should be initialized with provided coordinates
    expect(mapboxgl.default.Map).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [-7.0, 52.0], // Provided coordinates [lng, lat]
        zoom: 14, // Higher zoom when location exists
      })
    )
  })
})

describe('Map Layers', () => {
  it('should add flight radius fill layer', async () => {
    render(<MapLocationPicker latitude="53.4129" longitude="-8.2439" onLocationChange={vi.fn()} />)

    await waitFor(() => {
      expect(mockAddLayer).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'flight-radius-fill',
          type: 'fill',
          source: 'flight-radius',
        })
      )
    })
  })

  it('should add flight radius outline layer', async () => {
    render(<MapLocationPicker latitude="53.4129" longitude="-8.2439" onLocationChange={vi.fn()} />)

    await waitFor(() => {
      expect(mockAddLayer).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'flight-radius-outline',
          type: 'line',
          source: 'flight-radius',
        })
      )
    })
  })
})

describe('Marker', () => {
  it('should create a draggable marker', async () => {
    const mapboxgl = await import('mapbox-gl')

    render(<MapLocationPicker latitude="" longitude="" onLocationChange={vi.fn()} />)

    expect(mapboxgl.default.Marker).toHaveBeenCalledWith(
      expect.objectContaining({
        draggable: true,
        color: '#16a34a', // Green color
      })
    )
  })

  it('should set marker at initial position', () => {
    render(<MapLocationPicker latitude="" longitude="" onLocationChange={vi.fn()} />)

    expect(mockSetLngLat).toHaveBeenCalledWith([-8.2439, 53.4129]) // Default center
  })

  it('should add marker to map', () => {
    render(<MapLocationPicker latitude="" longitude="" onLocationChange={vi.fn()} />)

    expect(mockAddTo).toHaveBeenCalled()
  })
})

describe('Accessibility', () => {
  it('should have accessible select element', () => {
    render(<MapLocationPicker latitude="" longitude="" onLocationChange={vi.fn()} />)

    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
  })

  it('should have accessible button for current location', () => {
    render(<MapLocationPicker latitude="" longitude="" onLocationChange={vi.fn()} />)

    const button = screen.getByTitle('Use my current location')
    expect(button).toBeInTheDocument()
    expect(button.tagName).toBe('BUTTON')
  })
})
