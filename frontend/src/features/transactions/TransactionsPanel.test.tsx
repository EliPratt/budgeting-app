import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithClient } from '../../test/render'
import * as accountsApi from '../accounts/api'
import * as envelopesApi from '../envelopes/api'
import * as api from './api'
import { TransactionsPanel } from './TransactionsPanel'

describe('TransactionsPanel', () => {
  afterEach(() => vi.restoreAllMocks())

  it('lists transactions fetched on mount', async () => {
    vi.spyOn(accountsApi, 'listAccounts').mockResolvedValue([
      { id: 1, name: 'Checking', type: 'checking', starting_balance: '0', balance: '0' },
    ])
    vi.spyOn(envelopesApi, 'listEnvelopes').mockResolvedValue([])
    vi.spyOn(api, 'listTransactions').mockResolvedValue([
      {
        id: 1,
        account_id: 1,
        envelope_id: null,
        date: '2026-01-05',
        amount: '-25.00',
        payee: 'Trader Joes',
        source: 'manual',
      },
    ])

    renderWithClient(<TransactionsPanel />)

    expect(await screen.findByText('Trader Joes')).toBeInTheDocument()
  })

  it('adds a new transaction to the list after submitting the form', async () => {
    vi.spyOn(accountsApi, 'listAccounts').mockResolvedValue([
      { id: 1, name: 'Checking', type: 'checking', starting_balance: '0', balance: '0' },
    ])
    vi.spyOn(envelopesApi, 'listEnvelopes').mockResolvedValue([
      { id: 1, name: 'Groceries', group_name: null },
    ])
    vi.spyOn(api, 'listTransactions').mockResolvedValue([])
    vi.spyOn(api, 'createTransaction').mockResolvedValue({
      id: 2,
      account_id: 1,
      envelope_id: 1,
      date: '2026-01-06',
      amount: '-10.00',
      payee: 'Coffee Shop',
      source: 'manual',
    })

    renderWithClient(<TransactionsPanel />)
    await waitFor(() => expect(api.listTransactions).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2026-01-06' } })
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '-10.00' } })
    fireEvent.change(screen.getByLabelText(/payee/i), { target: { value: 'Coffee Shop' } })
    fireEvent.change(screen.getByLabelText(/envelope/i), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }))

    expect(await screen.findByText('Coffee Shop')).toBeInTheDocument()
    expect(api.createTransaction).toHaveBeenCalledWith({
      accountId: 1,
      date: '2026-01-06',
      amount: '-10.00',
      payee: 'Coffee Shop',
      envelopeId: 1,
    })
  })
})
