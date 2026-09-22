import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from './lib/api'
import * as accountsApi from './features/accounts/api'
import * as envelopesApi from './features/envelopes/api'
import * as monthsApi from './features/months/api'
import * as billsApi from './features/recurring-bills/api'
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
    vi.spyOn(billsApi, 'listRecurringBills').mockResolvedValue([])
    vi.spyOn(billsApi, 'listDueBills').mockResolvedValue([])
    vi.spyOn(monthsApi, 'getMonthOverview').mockResolvedValue({
      year: 2026,
      month: 1,
      envelopes: [],
      summary: {
        total_income: '0.00',
        total_assigned: '0.00',
        to_be_assigned: '0.00',
        balanced: true,
      },
    })

    render(<App />)

    expect(await screen.findByText('owner@example.com')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Budget' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Accounts' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Envelopes' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Recurring bills' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Transactions' })).toBeInTheDocument()
  })
})
