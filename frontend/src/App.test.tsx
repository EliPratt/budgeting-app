import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from './lib/api'
import App from './App'

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the login form when there is no active session', async () => {
    vi.spyOn(api, 'getMe').mockResolvedValue(null)
    render(<App />)
    expect(await screen.findByRole('button', { name: /log in/i })).toBeInTheDocument()
  })

  it('shows the signed-in view when a session already exists', async () => {
    vi.spyOn(api, 'getMe').mockResolvedValue({ email: 'owner@example.com' })
    render(<App />)
    expect(await screen.findByText('Signed in as owner@example.com')).toBeInTheDocument()
  })
})
