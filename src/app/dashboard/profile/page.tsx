'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId, getUserRole, type UserRole } from '@/lib/auth'
import { User, Mail, Shield, Calendar, Edit2, Save, Download } from 'lucide-react'

interface UserProfile {
  id: string
  role: 'User' | 'Admin'
  created_at: string
  updated_at: string
  email?: string
  first_name?: string
  last_name?: string
  mobile_number?: string
  user_id?: string
}

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [userRole, setUserRole] = useState<UserRole>('User')
  const [createdAt, setCreatedAt] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Profile editing state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileFormData, setProfileFormData] = useState({
    first_name: '',
    last_name: '',
    mobile_number: '',
  })
  const [savingProfile, setSavingProfile] = useState(false)

  // Data export state
  const [exportingMyData, setExportingMyData] = useState(false)

  const fetchUserProfile = useCallback(async () => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setUserProfile(data as UserProfile)
        setProfileFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          mobile_number: data.mobile_number || '',
        })
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }, [userId])

  const updateUserProfile = async () => {
    if (!userId) return

    setSavingProfile(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          first_name: profileFormData.first_name || null,
          last_name: profileFormData.last_name || null,
          mobile_number: profileFormData.mobile_number || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)

      if (error) throw error

      alert('Profile updated successfully!')
      setEditingProfile(false)
      fetchUserProfile() // Refresh profile data
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile. Please try again.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleCancelProfileEdit = () => {
    setEditingProfile(false)
    // Reset form data to current profile values
    if (userProfile) {
      setProfileFormData({
        first_name: userProfile.first_name || '',
        last_name: userProfile.last_name || '',
        mobile_number: userProfile.mobile_number || '',
      })
    }
  }

  const exportMyDataAsJSON = async () => {
    if (!userId) return

    setExportingMyData(true)
    try {
      // Fetch all user data
      const [
        { data: apiaries },
        { data: hives },
        { data: queens },
        { data: inspections },
        { data: varroaChecks },
        { data: varroaTreatments },
      ] = await Promise.all([
        supabase.from('apiaries').select('*').eq('user_id', userId),
        supabase.from('hives').select('*').eq('user_id', userId),
        supabase.from('queens').select('*').eq('user_id', userId),
        supabase.from('inspections').select('*').eq('user_id', userId),
        supabase.from('varroa_checks').select('*').eq('user_id', userId),
        supabase.from('varroa_treatments').select('*').eq('user_id', userId),
      ])

      const exportData = {
        export_info: {
          exported_at: new Date().toISOString(),
          user_id: userId,
          format: 'JSON',
        },
        apiaries: apiaries || [],
        hives: hives || [],
        queens: queens || [],
        inspections: inspections || [],
        varroa_checks: varroaChecks || [],
        varroa_treatments: varroaTreatments || [],
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `my-beekeeping-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      alert('Your data has been exported successfully!')
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('Failed to export data. Check console for details.')
    } finally {
      setExportingMyData(false)
    }
  }

  const exportMyDataAsCSV = async () => {
    if (!userId) return

    setExportingMyData(true)
    try {
      // Fetch all user data
      const [
        { data: apiaries },
        { data: hives },
        { data: queens },
        { data: inspections },
        { data: varroaChecks },
        { data: varroaTreatments },
      ] = await Promise.all([
        supabase.from('apiaries').select('*').eq('user_id', userId),
        supabase.from('hives').select('*').eq('user_id', userId),
        supabase.from('queens').select('*').eq('user_id', userId),
        supabase.from('inspections').select('*').eq('user_id', userId),
        supabase.from('varroa_checks').select('*').eq('user_id', userId),
        supabase.from('varroa_treatments').select('*').eq('user_id', userId),
      ])

      const convertToCSV = (data: Record<string, unknown>[], tableName: string) => {
        if (!data || data.length === 0) return `${tableName}\nNo data\n\n`

        const headers = Object.keys(data[0])
        const rows = data.map(row =>
          headers.map(header => {
            const value = row[header]
            if (value === null || value === undefined) return ''
            if (typeof value === 'string' && value.includes(',')) return `"${value}"`
            return value
          }).join(',')
        )

        return `${tableName}\n${headers.join(',')}\n${rows.join('\n')}\n\n`
      }

      let csvContent = `Beekeeping Data Export\nExported on: ${new Date().toISOString()}\n\n`
      csvContent += convertToCSV(apiaries || [], 'Apiaries')
      csvContent += convertToCSV(hives || [], 'Hives')
      csvContent += convertToCSV(queens || [], 'Queens')
      csvContent += convertToCSV(inspections || [], 'Inspections')
      csvContent += convertToCSV(varroaChecks || [], 'Varroa Checks')
      csvContent += convertToCSV(varroaTreatments || [], 'Varroa Treatments')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `my-beekeeping-data-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      alert('Your data has been exported successfully!')
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('Failed to export data. Check console for details.')
    } finally {
      setExportingMyData(false)
    }
  }

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
  }, [router])

  // Fetch user profile when userId is set
  useEffect(() => {
    if (userId) {
      fetchUserProfile()
    }
  }, [userId, fetchUserProfile])

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

      {/* Personal Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
          {!editingProfile && (
            <button
              onClick={() => setEditingProfile(true)}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <Edit2 size={16} />
              Edit Profile
            </button>
          )}
        </div>

        {editingProfile ? (
          /* Edit Mode */
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Update your personal information. All fields are optional.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={profileFormData.first_name}
                  onChange={(e) =>
                    setProfileFormData({ ...profileFormData, first_name: e.target.value })
                  }
                  placeholder="Enter your first name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={profileFormData.last_name}
                  onChange={(e) =>
                    setProfileFormData({ ...profileFormData, last_name: e.target.value })
                  }
                  placeholder="Enter your last name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={profileFormData.mobile_number}
                  onChange={(e) =>
                    setProfileFormData({ ...profileFormData, mobile_number: e.target.value })
                  }
                  placeholder="Enter your mobile number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={updateUserProfile}
                disabled={savingProfile}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
              >
                {savingProfile ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Changes
                  </>
                )}
              </button>
              <button
                onClick={handleCancelProfileEdit}
                disabled={savingProfile}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Display Mode */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <User size={20} className="text-gray-600 mt-1" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-500 mb-1">First Name</div>
                  <div className="text-gray-900">
                    {userProfile?.first_name || <span className="text-gray-400 italic">Not set</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <User size={20} className="text-gray-600 mt-1" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-500 mb-1">Last Name</div>
                  <div className="text-gray-900">
                    {userProfile?.last_name || <span className="text-gray-400 italic">Not set</span>}
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Mail size={20} className="text-gray-600 mt-1" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-500 mb-1">Mobile Number</div>
                  <div className="text-gray-900">
                    {userProfile?.mobile_number || <span className="text-gray-400 italic">Not set</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Account Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>

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

      {/* Data Export */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">My Data Export</h2>
        <p className="text-sm text-gray-600 mb-4">
          Export all your personal beekeeping data including apiaries, hives, queens, inspections, and varroa management records.
        </p>
        <ul className="text-sm text-gray-600 space-y-1 mb-4">
          <li>• Includes all your personal beekeeping records</li>
          <li>• Choose between JSON or CSV format</li>
          <li>• Use for backup, analysis, or migration purposes</li>
          <li>• Only includes data you own and have created</li>
        </ul>
        <div className="flex gap-3">
          <button
            onClick={exportMyDataAsJSON}
            disabled={exportingMyData}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
          >
            {exportingMyData ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download size={16} />
                Export as JSON
              </>
            )}
          </button>
          <button
            onClick={exportMyDataAsCSV}
            disabled={exportingMyData}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
          >
            {exportingMyData ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download size={16} />
                Export as CSV
              </>
            )}
          </button>
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
