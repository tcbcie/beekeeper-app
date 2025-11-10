'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Search, Calendar, CreditCard, DollarSign, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface SubscriptionHistoryRecord {
  id: string
  user_id: string
  user_email?: string
  code?: string | null
  code_id?: string | null
  activated_at: string
  expires_at: string
  subscription_type: string
  price_paid: number
  payment_method: string
  stripe_payment_intent_id?: string | null
}

interface UserProfile {
  id: string
  email?: string
}

export default function SubscriptionHistoryPage() {
  const router = useRouter()
  const [subscriptionHistory, setSubscriptionHistory] = useState<SubscriptionHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'credit_card' | 'registration_code'>('all')
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | '30days' | '90days' | '1year'>('all')

  useEffect(() => {
    fetchSubscriptionHistory()
  }, [])

  const fetchSubscriptionHistory = async () => {
    setLoading(true)
    try {
      // Fetch subscription history
      const { data: historyData, error: historyError } = await supabase
        .from('subscription_history')
        .select('*')
        .order('activated_at', { ascending: false })

      if (historyError) throw historyError

      // Fetch users to get email addresses
      const { data: usersData, error: usersError } = await supabase.rpc('get_users_with_email')

      if (usersError) throw usersError

      if (historyData) {
        // Create a map of user_id to email
        const emailMap = new Map(usersData?.map((u: UserProfile) => [u.id, u.email]) || [])

        const formattedData = historyData.map((record) => ({
          id: record.id,
          user_id: record.user_id,
          code: record.code,
          code_id: record.code_id,
          activated_at: record.activated_at,
          expires_at: record.expires_at,
          subscription_type: record.subscription_type,
          price_paid: record.price_paid,
          payment_method: record.payment_method,
          stripe_payment_intent_id: record.stripe_payment_intent_id,
          user_email: emailMap.get(record.user_id) || 'Unknown'
        }))

        setSubscriptionHistory(formattedData as SubscriptionHistoryRecord[])
      }
    } catch (error) {
      console.error('❌ Error fetching subscription history:', error)
      alert('Failed to fetch subscription history. Make sure you have admin permissions.')
    } finally {
      setLoading(false)
    }
  }

  // Filter records based on search and filters
  const filteredRecords = subscriptionHistory.filter(record => {
    // Search filter
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = !searchTerm ||
      record.user_email?.toLowerCase().includes(searchLower) ||
      record.code?.toLowerCase().includes(searchLower) ||
      record.stripe_payment_intent_id?.toLowerCase().includes(searchLower)

    if (!matchesSearch) return false

    // Payment method filter
    if (paymentMethodFilter !== 'all' && record.payment_method !== paymentMethodFilter) {
      return false
    }

    // Date range filter
    if (dateRangeFilter !== 'all') {
      const activatedDate = new Date(record.activated_at)
      const now = new Date()
      const daysAgo = {
        '30days': 30,
        '90days': 90,
        '1year': 365
      }[dateRangeFilter]

      if (daysAgo) {
        const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
        if (activatedDate < cutoffDate) return false
      }
    }

    return true
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard/settings?section=users')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            Back to User Management
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Subscription History</h1>
          <p className="text-gray-600 mt-2">View all subscription activations and payments</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by email, code, or transaction ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Filter Row */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Payment Method Filter */}
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-gray-500" />
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value as 'all' | 'credit_card' | 'registration_code')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Payment Methods</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="registration_code">Registration Code</option>
                </select>
              </div>

              {/* Date Range Filter */}
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-gray-500" />
                <select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value as 'all' | '30days' | '90days' | '1year')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Time</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="90days">Last 90 Days</option>
                  <option value="1year">Last Year</option>
                </select>
              </div>

              {/* Results Count */}
              <div className="ml-auto text-sm text-gray-600">
                Showing {filteredRecords.length} of {subscriptionHistory.length} records
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">
              {subscriptionHistory.length === 0
                ? 'No subscription history records found.'
                : 'No records match your filters.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction ID
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.user_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.code || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          record.payment_method === 'credit_card'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {record.payment_method === 'credit_card' ? (
                            <>
                              <CreditCard size={12} />
                              Credit Card
                            </>
                          ) : (
                            'Registration Code'
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-1">
                          <DollarSign size={14} className="text-gray-400" />
                          {formatCurrency(record.price_paid)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(record.activated_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(record.expires_at)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {record.stripe_payment_intent_id ? (
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              {record.stripe_payment_intent_id.slice(0, 20)}...
                            </code>
                            <a
                              href={`https://dashboard.stripe.com/payments/${record.stripe_payment_intent_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
