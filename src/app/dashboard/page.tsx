'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId, getUserRole, type UserRole } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import StatCard from '@/components/ui/StatCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Shield } from 'lucide-react'

interface Inspection {
  id: string
  inspection_date: string
  queen_seen: boolean
  hives?: {
    hive_number: string
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    queens: 0,
    activeQueens: 0,
    hives: 0,
    activeBatches: 0,
    recentInspections: 0,
  })
  const [recentActivity, setRecentActivity] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<UserRole>('User')
  const router = useRouter()

  useEffect(() => {
    const initUser = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      setUserId(id)

      // Fetch user role
      const role = await getUserRole()
      setUserRole(role)

      fetchDashboardData(id)
    }
    initUser()
  }, [])

  const fetchDashboardData = async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    try {
      // Fetch all stats in parallel
      const [queensRes, activeQueensRes, hivesRes, batchesRes, inspectionsRes] = await Promise.all([
        supabase.from('queens').select('id', { count: 'exact', head: true }).eq('user_id', currentUserId),
        supabase.from('queens').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('user_id', currentUserId),
        supabase.from('hives').select('id', { count: 'exact', head: true }).eq('user_id', currentUserId),
        supabase.from('rearing_batches').select('id', { count: 'exact', head: true }).in('status', ['grafted', 'emerged']).eq('user_id', currentUserId),
        supabase.from('inspections').select('id', { count: 'exact', head: true }).gte('inspection_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]).eq('user_id', currentUserId),
      ])

      setStats({
        queens: queensRes.count || 0,
        activeQueens: activeQueensRes.count || 0,
        hives: hivesRes.count || 0,
        activeBatches: batchesRes.count || 0,
        recentInspections: inspectionsRes.count || 0,
      })

      // Fetch recent activity
      const { data: inspections } = await supabase
        .from('inspections')
        .select('*, hives(hive_number)')
        .eq('user_id', currentUserId)
        .order('inspection_date', { ascending: false })
        .limit(5)

      setRecentActivity((inspections as Inspection[]) || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner text="Loading dashboard..." />

  const statCards = [
    { label: 'Total Queens', value: stats.queens, icon: '👑', color: 'bg-purple-50 text-purple-700' },
    { label: 'Active Queens', value: stats.activeQueens, icon: '✨', color: 'bg-green-50 text-green-700' },
    { label: 'Hives', value: stats.hives, icon: '🐝', color: 'bg-amber-50 text-amber-700' },
    { label: 'Active Batches', value: stats.activeBatches, icon: '🥚', color: 'bg-blue-50 text-blue-700' },
    { label: 'Inspections (7d)', value: stats.recentInspections, icon: '📋', color: 'bg-indigo-50 text-indigo-700' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          {userRole === 'Admin' && (
            <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full flex items-center gap-1">
              <Shield size={14} />
              Admin
            </span>
          )}
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          Refresh
        </button>
      </div>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            color={card.color}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/dashboard/queens"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-colors text-center"
          >
            <div className="text-3xl mb-2">➕👑</div>
            <div className="font-medium">Add Queen</div>
          </a>
          <a
            href="/dashboard/batches"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
          >
            <div className="text-3xl mb-2">➕🥚</div>
            <div className="font-medium">New Batch</div>
          </a>
          <a
            href="/dashboard/inspections"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-center"
          >
            <div className="text-3xl mb-2">➕📋</div>
            <div className="font-medium">Record Inspection</div>
          </a>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {recentActivity.map((inspection) => (
            <div key={inspection.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <span className="font-medium">
                  Inspection of {inspection.hives?.hive_number || 'Unknown Hive'}
                </span>
                <span className="text-sm text-gray-500 ml-2">{inspection.inspection_date}</span>
              </div>
              <span
                className={`px-2 py-1 text-xs rounded ${
                  inspection.queen_seen
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {inspection.queen_seen ? 'Queen Seen' : 'No Queen'}
              </span>
            </div>
          ))}
          {recentActivity.length === 0 && (
            <p className="text-gray-500 text-center py-4">No recent activity</p>
          )}
        </div>
      </div>

      {/* Data Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-3">Queen Status Distribution</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active</span>
              <span className="font-medium text-green-600">{stats.activeQueens}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Inactive</span>
              <span className="font-medium text-gray-600">{stats.queens - stats.activeQueens}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-3">System Health</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-600">Database Connected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-600">All Systems Operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}