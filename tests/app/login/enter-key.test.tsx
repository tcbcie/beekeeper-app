import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * Pressing Enter must submit in the mode the user is in (C1-14). The browser "clicks" the form's
 * first submit button on Enter, and that button (Log in) switched the mode back to sign-in, so a
 * new user arriving with ?signup=true got "Invalid login credentials".
 */

const replace = vi.fn()
const push = vi.fn()
let search = 'signup=true'
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams(search),
}))

const signUp = vi.fn(async () => ({ error: null }))
const signInWithPassword = vi.fn(async () => ({ error: null }))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      signUp: (...args: unknown[]) => signUp(...(args as [])),
      signInWithPassword: (...args: unknown[]) => signInWithPassword(...(args as [])),
    },
    rpc: vi.fn(async () => ({ data: false, error: null })),
  },
}))

import LoginPage from '@/app/login/page'

function fillAndPressEnter() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } })
  const password = screen.getByLabelText('Password')
  fireEvent.change(password, { target: { value: 'secret123' } })
  fireEvent.keyDown(password, { key: 'Enter' })
}

describe('login form Enter key', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('signs up when the page is in sign-up mode', async () => {
    search = 'signup=true'
    render(<LoginPage />)
    await screen.findByLabelText('Email')
    fillAndPressEnter()
    await waitFor(() => expect(signUp).toHaveBeenCalled())
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it('signs in when the page is in log-in mode', async () => {
    search = ''
    render(<LoginPage />)
    await screen.findByLabelText('Email')
    fillAndPressEnter()
    await waitFor(() => expect(signInWithPassword).toHaveBeenCalled())
    expect(signUp).not.toHaveBeenCalled()
  })
})
