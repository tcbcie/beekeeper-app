import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Hoist the mock objects so they're available during module initialization
const { mockAuth, mockFrom, mockSupabaseClient } = vi.hoisted(() => {
  // The route fails fast at import without these, and imports are hoisted above test code,
  // so they are set here, before the route module loads.
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'

  const mockAuth = {
    getUser: vi.fn()
  }

  const mockFrom = vi.fn()

  const mockSupabaseClient = {
    auth: mockAuth,
    from: mockFrom
  }

  return { mockAuth, mockFrom, mockSupabaseClient }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}))

// Import the route after setting up mocks
import { mockQuery } from '../../utils/supabase-mock'
import { POST } from '@/app/api/admin/update-user-role/route'

type ProfileResult = { data?: unknown; error?: unknown; count?: number | null }

/**
 * The route reads `profiles` in a fixed order: the caller's admin check, the target's current
 * role, the active-admin count (only when demoting an Admin), then the update. Each call to
 * `from('profiles')` takes the next result; the audit-log insert always succeeds.
 */
function mockProfileCalls(results: ProfileResult[]) {
  const queue = [...results]
  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') {
      const next = queue.shift() ?? {}
      return mockQuery({ data: next.data ?? null, error: next.error ?? null, count: next.count ?? null })
    }
    return mockQuery({ data: null, error: null })
  })
}

const ADMIN = { data: { role: 'Admin', is_active: true } }

function roleRequest(targetUserId: string, newRole: string) {
  return new NextRequest('http://localhost:3000/api/admin/update-user-role', {
    method: 'POST',
    headers: { Authorization: 'Bearer admin-token' },
    body: JSON.stringify({ targetUserId, newRole }),
  })
}

describe('Admin Update User Role API', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 when authorization header is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/update-user-role', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: 'user-123', newRole: 'Power User' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorised')
    })

    it('should return 401 when token is invalid', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      })

      const request = new NextRequest('http://localhost:3000/api/admin/update-user-role', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer invalid-token'
        },
        body: JSON.stringify({ targetUserId: 'user-123', newRole: 'Power User' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorised')
    })

    it('should return 403 when user is not an admin', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'user@example.com' } },
        error: null
      })

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'User' },
              error: null
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/admin/update-user-role', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({ targetUserId: 'user-456', newRole: 'Power User' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })
  })

  describe('Input Validation', () => {
    beforeEach(() => {
      // Setup admin user for validation tests
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123', email: 'admin@example.com' } },
        error: null
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'Admin' },
                  error: null
                })
              })
            })
          }
        }
        return {}
      })
    })

    it('should return 400 when targetUserId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/update-user-role', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify({ newRole: 'Power User' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing targetUserId or newRole')
    })

    it('should return 400 when newRole is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/update-user-role', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify({ targetUserId: 'user-123' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing targetUserId or newRole')
    })

    it('should return 400 when role is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/update-user-role', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify({ targetUserId: 'user-123', newRole: 'SuperAdmin' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid role')
    })

    it('should accept "User" as valid role', async () => {
      // The target is a User, so no Admin demotion and no last-admin check.
      mockProfileCalls([ADMIN, { data: { role: 'User' } }, { data: [{ id: 'user-123' }] }])

      const response = await POST(roleRequest('user-123', 'User'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
    it('should accept "Power User" as valid role', async () => {
      // The target is a User, so no Admin demotion and no last-admin check.
      mockProfileCalls([ADMIN, { data: { role: 'User' } }, { data: [{ id: 'user-123' }] }])

      const response = await POST(roleRequest('user-123', 'Power User'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
    it('should accept "Admin" as valid role', async () => {
      // The target is a User, so no Admin demotion and no last-admin check.
      mockProfileCalls([ADMIN, { data: { role: 'User' } }, { data: [{ id: 'user-123' }] }])

      const response = await POST(roleRequest('user-123', 'Admin'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Self-Role Change Prevention', () => {
    it('should return 403 when admin tries to change their own role', async () => {
      const adminId = 'admin-123'

      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: adminId, email: 'admin@example.com' } },
        error: null
      })

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'Admin' },
              error: null
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/admin/update-user-role', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify({ targetUserId: adminId, newRole: 'User' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Cannot change your own role')
    })
  })

  describe('Successful Role Updates', () => {
    it('should successfully update user role to Power User', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123', email: 'admin@example.com' } },
        error: null
      })
      mockProfileCalls([ADMIN, { data: { role: 'User' } }, { data: [{ id: 'user-456' }] }])

      const response = await POST(roleRequest('user-456', 'Power User'))
      const data = await response.json()

      expect(response.status).toBe(200)
      // Only a success flag: the profile row holds tokens the browser has no use for.
      expect(data).toEqual({ success: true })
    })

    it('should refuse to demote the last remaining administrator', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123', email: 'admin@example.com' } },
        error: null
      })
      mockProfileCalls([ADMIN, { data: { role: 'Admin' } }, { count: 1 }])

      const response = await POST(roleRequest('admin-456', 'User'))
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('Cannot demote the last remaining administrator')
    })
    it('should return 404 when target user is not found', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123', email: 'admin@example.com' } },
        error: null
      })
      mockProfileCalls([ADMIN, { data: null, error: { message: 'No rows' } }])

      const response = await POST(roleRequest('nonexistent-user', 'Power User'))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123', email: 'admin@example.com' } },
        error: null
      })
      mockProfileCalls([ADMIN, { data: { role: 'User' } }, { error: { message: 'Database connection error' } }])

      const response = await POST(roleRequest('user-456', 'Power User'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update role')
      // Database detail stays in the server log, never in the response.
      expect(data.details).toBeUndefined()
    })
  })
})
