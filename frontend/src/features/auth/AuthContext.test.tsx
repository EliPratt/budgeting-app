import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../lib/api'
import { AuthProvider, useAuth } from './AuthContext'

function Probe() {
  const { user, loading, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <button onClick={() => login('owner@example.com', 'pw')}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  )
}

describe('AuthProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts loading, then reflects the unauthenticated session from getMe', async () => {
    vi.spyOn(api, 'getMe').mockResolvedValue(null)

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    expect(await screen.findByTestId('loading')).toHaveTextContent('false')
    expect(screen.getByTestId('user')).toHaveTextContent('none')
  })

  it('reflects the authenticated session from getMe', async () => {
    vi.spyOn(api, 'getMe').mockResolvedValue({ email: 'owner@example.com' })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    expect(await screen.findByTestId('user')).toHaveTextContent('owner@example.com')
  })

  it('sets the user after a successful login', async () => {
    vi.spyOn(api, 'getMe').mockResolvedValue(null)
    vi.spyOn(api, 'login').mockResolvedValue({ email: 'owner@example.com' })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await screen.findByTestId('loading')

    await act(async () => {
      screen.getByText('login').click()
    })

    expect(screen.getByTestId('user')).toHaveTextContent('owner@example.com')
  })

  it('clears the user after logout', async () => {
    vi.spyOn(api, 'getMe').mockResolvedValue({ email: 'owner@example.com' })
    vi.spyOn(api, 'logout').mockResolvedValue(undefined)

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await screen.findByText('owner@example.com')

    await act(async () => {
      screen.getByText('logout').click()
    })

    expect(screen.getByTestId('user')).toHaveTextContent('none')
  })
})
