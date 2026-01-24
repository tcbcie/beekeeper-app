'use client'

import dynamic from 'next/dynamic'

const ApiaryAreaMap = dynamic(() => import('./ApiaryAreaMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
  )
})

interface ApiaryAreaMapWrapperProps {
  lat: number
  lon: number
}

export default function ApiaryAreaMapWrapper({ lat, lon }: ApiaryAreaMapWrapperProps) {
  return (
    <div className="h-40 bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
      <ApiaryAreaMap lat={lat} lon={lon} radiusKm={5} />
      {/* Location label overlay */}
      <div className="absolute bottom-2 left-2 bg-white/90 dark:bg-slate-800/90 px-3 py-1.5 rounded-lg shadow-md flex items-center gap-2 z-[1000]">
        <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Source Apiary Foraging Area (~5km)</span>
      </div>
    </div>
  )
}
