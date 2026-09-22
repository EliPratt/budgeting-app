import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from './lib/api'
import * as accountsApi from './features/accounts/api'
import * as envelopesApi from './features/envelopes/api'
import * as transactionsApi from './features/transactions/api'
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

  it('shows the dashboard when a session already exists', async () => {
    vi.spyOn(api, 'getMe').mockResolvedValue({ email: 'owner@example.com' })
    vi.spyOn(accountsApi, 'listAccounts').mockResolvedValue([])
    vi.spyOn(envelopesApi, 'listEnvelopes').mockResolvedValue([])
    vi.spyOn(transactionsApi, 'listTransactions').mockResolvedValue([])

    render(<App />)

    expect(await screen.findByText('owner@example.com')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Accounts' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Envelopes' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Transactions' })).toBeInTheDocument()
  })
})
