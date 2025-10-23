'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId, getUserRole, type UserRole } from '@/lib/auth'
import { User, Mail, Shield, Calendar, Edit2 } from 'lucide-react'

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [userRole, setUserRole] = useState<UserRole>('User')
  const [createdAt, setCreatedAt] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const initUser = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      setUserId(id)

      // Get user email from Supabase auth
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email || 'No email')
        setCreatedAt(user.created_at || '')
      }

      // Get user role
      const role = await getUserRole()
      setUserRole(role)

      setLoading(false)
    }
    initUser()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <User size={32} className="text-gray-700" />
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Account Information</h2>
          <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2">
            <Edit2 size={16} />
            Edit Profile (Coming Soon)
          </button>
        </div>

        <div className="space-y-4">
          {/* Email */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <Mail size={20} className="text-gray-600 mt-1" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">Email Address</div>
              <div className="text-gray-900 font-medium">{userEmail}</div>
            </div>
          </div>

          {/* User ID */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <User size={20} className="text-gray-600 mt-1" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">User ID</div>
              <div className="text-gray-900 font-mono text-sm break-all">{userId}</div>
            </div>
          </div>

          {/* Role */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <Shield size={20} className="text-gray-600 mt-1" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">Role</div>
              <div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  userRole === 'Admin'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {userRole === 'Admin' && <Shield size={14} className="mr-1" />}
                  {userRole}
                </span>
              </div>
            </div>
          </div>

          {/* Account Created */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <Calendar size={20} className="text-gray-600 mt-1" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">Account Created</div>
              <div className="text-gray-900">
                {createdAt ? new Date(createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Unknown'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Settings</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Change Password</div>
              <div className="text-sm text-gray-600">Update your account password</div>
            </div>
            <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              Coming Soon
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Email Notifications</div>
              <div className="text-sm text-gray-600">Manage your notification preferences</div>
            </div>
            <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              Coming Soon
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Data Privacy</div>
              <div className="text-sm text-gray-600">View and manage your data</div>
            </div>
            <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              Coming Soon
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-lg shadow p-6 border border-red-200">
        <h2 className="text-xl font-semibold text-red-900 mb-4">Danger Zone</h2>
        <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
          <div>
            <div className="font-medium text-red-900">Delete Account</div>
            <div className="text-sm text-red-700">Permanently delete your account and all data</div>
          </div>
          <button className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
            Coming Soon
          </button>
        </div>
      </div>
    </div>
  )
}
