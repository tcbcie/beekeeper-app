import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the Supabase client before importing the route
const mockAuth = {
  getUser: vi.fn()
}

const mockFrom = vi.fn()

const mockSupabaseClient = {
  auth: mockAuth,
  from: mockFrom
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}))

// Now import the route after mocking
const { POST } = await import('@/app/api/admin/update-user-role/route')

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
      expect(data.error).toBe('Missing authorization header')
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
      expect(data.error).toBe('Invalid authentication')
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
      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          const mockChain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'Admin' },
              error: null
            }),
            update: vi.fn().mockReturnThis()
          }

          // Handle both select and update chains
          mockChain.update = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: [{ id: 'user-123', role: 'User' }],
                error: null
              })
            })
          })

          mockChain.select = vi.fn().mockReturnValue(mockChain)

          return mockChain
        }
        return {}
      })

      const request = new NextRequest('http://localhost:3000/api/admin/update-user-role', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify({ targetUserId: 'user-123', newRole: 'User' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should accept "Power User" as valid role', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          const mockChain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'Admin' },
              error: null
            }),
            update: vi.fn().mockReturnThis()
          }

          mockChain.update = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: [{ id: 'user-123', role: 'Power User' }],
                error: null
              })
            })
          })

          mockChain.select = vi.fn().mockReturnValue(mockChain)

          return mockChain
        }
        return {}
      })

      const request = new NextRequest('http://localhost:3000/api/admin/update-user-role', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify({ targetUserId: 'user-123', newRole: 'Power User' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should accept "Admin" as valid role', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          const mockChain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'Admin' },
              error: null
            }),
            update: vi.fn().mockReturnThis()
          }

          mockChain.update = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: [{ id: 'user-123', role: 'Admin' }],
                error: null
              })
            })
          })

          mockChain.select = vi.fn().mockReturnValue(mockChain)

          return mockChain
        }
        return {}
      })

      const request = new NextRequest('http://localhost:3000/api/admin/update-user-role', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify({ targetUserId: 'user-123', newRole: 'Admin' })
      })

      const response = await POST(request)
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
      const adminId = 'admin-123'
      const targetUserId = 'user-456'

      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: adminId, email: 'admin@example.com' } },
        error: null
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          const mockChain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'Admin' },
              error: null
            }),
            update: vi.fn().mockReturnThis()
          }

          mockChain.update = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: [{ id: targetUserId, role: 'Power User', email: 'user@example.com' }],
                error: null
              })
            })
          })

          mockChain.select = vi.fn().mockReturnValue(mockChain)

          return mockChain
        }
        return {}
      })

      const request = new NextRequest('http://localhost:3000/api/admin/update-user-role', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify({ targetUserId, newRole: 'Power User' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('User role updated to Power User successfully')
      expect(data.data).toEqual({ id: targetUserId, role: 'Power User', email: 'user@example.com' })
    })

    it('should return 404 when target user is not found', async () => {
      const adminId = 'admin-123'
      const targetUserId = 'nonexistent-user'

      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: adminId, email: 'admin@example.com' } },
        error: null
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          const mockChain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'Admin' },
              error: null
            }),
            update: vi.fn().mockReturnThis()
          }

          mockChain.update = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })

          mockChain.select = vi.fn().mockReturnValue(mockChain)

          return mockChain
        }
        return {}
      })

      const request = new NextRequest('http://localhost:3000/api/admin/update-user-role', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify({ targetUserId, newRole: 'Power User' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const adminId = 'admin-123'
      const targetUserId = 'user-456'

      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: adminId, email: 'admin@example.com' } },
        error: null
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          const mockChain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: 'Admin' },
              error: null
            }),
            update: vi.fn().mockReturnThis()
          }

          mockChain.update = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database connection error' }
              })
            })
          })

          mockChain.select = vi.fn().mockReturnValue(mockChain)

          return mockChain
        }
        return {}
      })

      const request = new NextRequest('http://localhost:3000/api/admin/update-user-role', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify({ targetUserId, newRole: 'Power User' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update role')
      expect(data.details).toBe('Database connection error')
    })
  })
})
