import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from './api'
import { AccountsPanel } from './AccountsPanel'

describe('AccountsPanel', () => {
  afterEach(() => vi.restoreAllMocks())

  it('lists accounts fetched on mount', async () => {
    vi.spyOn(api, 'listAccounts').mockResolvedValue([
      { id: 1, name: 'Checking', type: 'checking', starting_balance: '100.00', balance: '75.00' },
    ])

    render(<AccountsPanel />)

    expect(await screen.findByText('Checking')).toBeInTheDocument()
    expect(screen.getByText('$75.00')).toBeInTheDocument()
  })

  it('adds a new account to the list after submitting the form', async () => {
    vi.spyOn(api, 'listAccounts').mockResolvedValue([])
    vi.spyOn(api, 'createAccount').mockResolvedValue({
      id: 2,
      name: 'Savings',
      type: 'savings',
      starting_balance: '500.00',
      balance: '500.00',
    })

    render(<AccountsPanel />)
    await waitFor(() => expect(api.listAccounts).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Savings' } })
    fireEvent.change(screen.getByLabelText(/type/i), { target: { value: 'savings' } })
    fireEvent.change(screen.getByLabelText(/starting balance/i), { target: { value: '500.00' } })
    fireEvent.click(screen.getByRole('button', { name: /add account/i }))

    expect(await screen.findByText('Savings')).toBeInTheDocument()
    expect(api.createAccount).toHaveBeenCalledWith({
      name: 'Savings',
      type: 'savings',
      startingBalance: '500.00',
    })
  })
})
