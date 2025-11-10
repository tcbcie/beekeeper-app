# Admin Reactivation Request UI - Implementation Guide

## Current Status
✅ Database system created (`sql/add_account_reactivation.sql`)
✅ Public reactivation page created (`/reactivate`)
✅ Login page detection and redirect implemented
❌ **Admin UI for managing requests - NOT YET IMPLEMENTED**

## What Needs to Be Added

### Location
`src/app/dashboard/settings/page.tsx` - User Management section

### Required Changes

#### 1. Add State Management (around line 135-141)
```typescript
// Add to existing user management state:
const [reactivationRequests, setReactivationRequests] = useState<ReactivationRequest[]>([])
const [showReactivationRequests, setShowReactivationRequests] = useState(false)
const [loadingRequests, setLoadingRequests] = useState(false)
```

#### 2. Add TypeScript Interface (around line 50-130)
```typescript
interface ReactivationRequest {
  id: string
  user_id: string
  original_email: string
  requested_at: string
  status: 'pending' | 'approved' | 'rejected'
  processed_at: string | null
  processed_by: string | null
  admin_notes: string | null
}
```

#### 3. Add Fetch Function (around line 400-550)
```typescript
const fetchReactivationRequests = async () => {
  setLoadingRequests(true)
  try {
    const { data, error } = await supabase
      .from('reactivation_requests')
      .select('*')
      .order('requested_at', { ascending: false })

    if (error) throw error
    setReactivationRequests(data || [])
  } catch (error) {
    console.error('Error fetching reactivation requests:', error)
    alert('Failed to load reactivation requests')
  } finally {
    setLoadingRequests(false)
  }
}
```

#### 4. Add Approve Handler
```typescript
const handleApproveReactivation = async (requestId: string, email: string) => {
  if (!confirm(`Approve reactivation request for ${email}?`)) return

  const notes = prompt('Optional admin notes:')

  try {
    const { data, error } = await supabase.rpc('reactivate_user_account', {
      p_request_id: requestId,
      p_admin_notes: notes || null
    })

    if (error) throw error

    if (data && typeof data === 'object' && 'success' in data) {
      if (data.success) {
        alert(`✅ Account reactivated for ${email}`)
        fetchReactivationRequests() // Refresh list
        fetchUsers() // Refresh active users
      } else {
        alert(`❌ ${data.message}`)
      }
    }
  } catch (error) {
    console.error('Error approving reactivation:', error)
    alert('Failed to approve reactivation request')
  }
}
```

#### 5. Add Reject Handler
```typescript
const handleRejectReactivation = async (requestId: string, email: string) => {
  const notes = prompt(`Reject reactivation request for ${email}?\n\nPlease provide a reason (required):`)
  if (!notes || notes.trim() === '') {
    alert('Rejection reason is required')
    return
  }

  try {
    const { data, error } = await supabase.rpc('reject_reactivation_request', {
      p_request_id: requestId,
      p_admin_notes: notes
    })

    if (error) throw error

    if (data && typeof data === 'object' && 'success' in data) {
      if (data.success) {
        alert(`✅ Request rejected for ${email}`)
        fetchReactivationRequests() // Refresh list
      } else {
        alert(`❌ ${data.message}`)
      }
    }
  } catch (error) {
    console.error('Error rejecting reactivation:', error)
    alert('Failed to reject reactivation request')
  }
}
```

#### 6. Add Third Tab (around line 2458-2486)
```typescript
<button
  onClick={() => {
    setShowDeletedUsers(false)
    setShowReactivationRequests(true)
    fetchReactivationRequests()
  }}
  className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
    showReactivationRequests
      ? 'border-purple-500 text-purple-600'
      : 'border-transparent text-gray-500 hover:text-gray-700'
  }`}
>
  Reactivation Requests ({reactivationRequests.filter(r => r.status === 'pending').length})
</button>
```

#### 7. Add Requests Display UI (after user list sections)
```typescript
{showReactivationRequests && (
  <div className="space-y-4">
    {loadingRequests ? (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading requests...</div>
      </div>
    ) : reactivationRequests.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
        No reactivation requests found
      </div>
    ) : (
      reactivationRequests.map((request) => (
        <div key={request.id} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="font-medium text-gray-900">{request.original_email}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  request.status === 'approved' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {request.status.toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Requested: {new Date(request.requested_at).toLocaleString()}</p>
                {request.processed_at && (
                  <p>Processed: {new Date(request.processed_at).toLocaleString()}</p>
                )}
                {request.admin_notes && (
                  <p className="text-gray-700 mt-2">
                    <span className="font-medium">Notes:</span> {request.admin_notes}
                  </p>
                )}
              </div>
            </div>
            {request.status === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleApproveReactivation(request.id, request.original_email)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleRejectReactivation(request.id, request.original_email)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      ))
    )}
  </div>
)}
```

## Testing Steps

1. **Run SQL script** in Supabase:
   ```sql
   sql/add_account_reactivation.sql
   ```

2. **Test as deleted user**:
   - Soft delete a test account
   - Visit `/reactivate`
   - Submit reactivation request

3. **Test as admin**:
   - Go to Settings > User Management
   - Click "Reactivation Requests" tab
   - Should see pending request
   - Approve or reject

4. **Verify restoration**:
   - Approved user can log in
   - All data intact
   - Email restored

## UI Mockup

```
┌─────────────────────────────────────────────────────────┐
│ User Management                                    🔒   │
├─────────────────────────────────────────────────────────┤
│ View and manage all user accounts...                   │
│                                                         │
│ [Active Users (15)] [Deleted Users (3)] [Reactivation Requests (2)] │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ user@example.com               [PENDING]        │   │
│ │ Requested: Nov 10, 2025, 2:30 PM               │   │
│ │                              [Approve] [Reject] │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ another@test.com               [APPROVED]       │   │
│ │ Requested: Nov 9, 2025, 10:15 AM               │   │
│ │ Processed: Nov 9, 2025, 11:00 AM               │   │
│ │ Notes: User confirmed via email                 │   │
│ └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Summary

**Estimated Lines of Code**: ~200-300 lines
**Files to Modify**: 1 file (`src/app/dashboard/settings/page.tsx`)
**Database Setup Required**: Yes (`sql/add_account_reactivation.sql`)
**Complexity**: Medium
**Time Estimate**: 30-45 minutes

This completes the full account reactivation system with admin management interface.
