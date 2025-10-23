'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUserId } from '@/lib/auth'
import { Wrench, Calendar, Calculator, FileText, Database } from 'lucide-react'

export default function ToolsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const initUser = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      setUserId(id)
    }
    initUser()
  }, [])

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  const tools = [
    {
      icon: Calendar,
      title: 'Queen Age Calculator',
      description: 'Calculate queen age and productivity metrics',
      status: 'Coming Soon'
    },
    {
      icon: Calculator,
      title: 'Varroa Treatment Planner',
      description: 'Plan and schedule varroa treatments',
      status: 'Coming Soon'
    },
    {
      icon: FileText,
      title: 'Reports Generator',
      description: 'Generate comprehensive reports for your apiary',
      status: 'Coming Soon'
    },
    {
      icon: Database,
      title: 'Data Export',
      description: 'Export your beekeeping data in various formats',
      status: 'Coming Soon'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wrench size={32} className="text-gray-700" />
        <h1 className="text-3xl font-bold text-gray-900">Tools</h1>
      </div>

      <p className="text-gray-600">
        Helpful tools and utilities for managing your beekeeping operations.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((tool, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow p-6 border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <tool.icon size={24} className="text-amber-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {tool.title}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {tool.description}
                </p>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {tool.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          More Tools Coming Soon
        </h3>
        <p className="text-blue-700">
          We're actively developing new tools to help you manage your beekeeping operations more efficiently.
          Check back soon for updates!
        </p>
      </div>
    </div>
  )
}
