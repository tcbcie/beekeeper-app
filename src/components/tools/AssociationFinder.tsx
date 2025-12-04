'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, MapPin, Globe, Mail } from 'lucide-react'

interface Association {
  id: string
  name: string
  county: string
  region: string
  contact_person?: string | null
  email?: string | null
  website?: string | null
  description?: string | null
}

export function AssociationFinder() {
  const [filterType, setFilterType] = useState<'all' | 'county' | 'region'>('all')
  const [selectedCounty, setSelectedCounty] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('')
  const [associations, setAssociations] = useState<Association[]>([])
  const [counties, setCounties] = useState<string[]>([])
  const [regions, setRegions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Load all associations on mount
  useEffect(() => {
    loadAssociations()
  }, [])

  // Extract unique counties and regions when associations load
  useEffect(() => {
    if (associations.length > 0) {
      const uniqueCounties = [...new Set(associations.map(a => a.county))].sort()
      const uniqueRegions = [...new Set(associations.map(a => a.region))].sort()
      setCounties(uniqueCounties)
      setRegions(uniqueRegions)
    }
  }, [associations])

  const loadAssociations = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('beekeeping_associations')
      .select('*')
      .order('name')

    if (!error && data) {
      setAssociations(data)
    }
    setLoading(false)
  }

  const filteredAssociations =
    filterType === 'county' && selectedCounty
      ? associations.filter(a => a.county === selectedCounty)
      : filterType === 'region' && selectedRegion
      ? associations.filter(a => a.region === selectedRegion)
      : associations

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-text-secondary">Loading associations...</div>
      </div>
    )
  }

  const handleFilterTypeChange = (type: 'all' | 'county' | 'region') => {
    setFilterType(type)
    // Reset selections when changing filter type
    setSelectedCounty('')
    setSelectedRegion('')
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-3">
        <button onClick={() => handleFilterTypeChange('all')}
          className={`px-4 py-2 rounded-lg font-medium ${filterType === 'all' ? 'bg-forest-600 text-white' : 'bg-sage-100 dark:bg-slate-800 text-foreground'}`}>
          All Associations
        </button>
        <button onClick={() => handleFilterTypeChange('county')}
          className={`px-4 py-2 rounded-lg font-medium ${filterType === 'county' ? 'bg-forest-600 text-white' : 'bg-sage-100 dark:bg-slate-800 text-foreground'}`}>
          By County
        </button>
        <button onClick={() => handleFilterTypeChange('region')}
          className={`px-4 py-2 rounded-lg font-medium ${filterType === 'region' ? 'bg-forest-600 text-white' : 'bg-sage-100 dark:bg-slate-800 text-foreground'}`}>
          By Region
        </button>
      </div>

      {filterType === 'county' && (
        <select value={selectedCounty} onChange={(e) => setSelectedCounty(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-sage-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-foreground focus:outline-none focus:ring-2 focus:ring-forest-500">
          <option value="">Select a county...</option>
          {counties.map(county => (<option key={county} value={county}>{county}</option>))}
        </select>
      )}

      {filterType === 'region' && (
        <div className="grid grid-cols-4 gap-2">
          {regions.map(region => (
            <button key={region} onClick={() => setSelectedRegion(region)}
              className={`px-3 py-2 rounded-lg font-medium ${selectedRegion === region ? 'bg-forest-600 text-white' : 'bg-sage-100 dark:bg-slate-800 text-foreground'}`}>
              {region}
            </button>
          ))}
        </div>
      )}

      <div className="bg-forest-50 dark:bg-forest-900/20 p-4 rounded-lg border border-forest-200 dark:border-forest-800">
        <h3 className="text-lg font-bold text-forest-900 dark:text-forest-100 flex items-center gap-2">
          <Users size={20} />
          {filteredAssociations.length} Association{filteredAssociations.length !== 1 ? 's' : ''} Found
        </h3>
      </div>

      <div className="space-y-4">
        {filteredAssociations.map((assoc) => (
          <div key={assoc.id} className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-sage-300 dark:border-slate-700 hover:border-forest-400 dark:hover:border-forest-600 transition-colors">
            <h4 className="font-bold text-lg text-foreground mb-2">{assoc.name}</h4>

            <div className="flex items-center gap-2 text-sm text-text-secondary mb-2">
              <MapPin size={14} />
              <span>{assoc.county}, {assoc.region}</span>
            </div>

            {assoc.description && (
              <p className="text-sm text-foreground mb-3">{assoc.description}</p>
            )}

            <div className="flex flex-wrap gap-3">
              {assoc.website && (
                <a href={assoc.website} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-forest-600 dark:text-forest-400 hover:underline">
                  <Globe size={14} />
                  <span>Website</span>
                </a>
              )}
              {assoc.email && (
                <a href={`mailto:${assoc.email}`}
                  className="inline-flex items-center gap-1 text-sm text-forest-600 dark:text-forest-400 hover:underline">
                  <Mail size={14} />
                  <span>{assoc.email}</span>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredAssociations.length === 0 && !loading && (
        <div className="text-center py-8 text-text-secondary">
          No associations found. Try selecting a different filter.
        </div>
      )}
    </div>
  )
}
