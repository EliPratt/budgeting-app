import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithClient } from '../../test/render'
import * as api from './api'
import { AccountsPanel } from './AccountsPanel'

describe('AccountsPanel', () => {
  afterEach(() => vi.restoreAllMocks())

  it('lists accounts fetched on mount', async () => {
    vi.spyOn(api, 'listAccounts').mockResolvedValue([
      { id: 1, name: 'Checking', type: 'checking', starting_balance: '100.00', balance: '75.00' },
    ])

    renderWithClient(<AccountsPanel />)

    // 'Checking' alone is ambiguous: it's also the static account-type
    // dropdown's option label, present before the fetched list ever
    // renders. Anchor on the balance, which only appears once the
    // account row itself has rendered.
    expect(await screen.findByText('$75.00')).toBeInTheDocument()
    expect(screen.getByText('Checking', { selector: 'span' })).toBeInTheDocument()
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

    renderWithClient(<AccountsPanel />)
    await waitFor(() => expect(api.listAccounts).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Savings' } })
    fireEvent.change(screen.getByLabelText(/type/i), { target: { value: 'savings' } })
    fireEvent.change(screen.getByLabelText(/starting balance/i), { target: { value: '500.00' } })
    fireEvent.click(screen.getByRole('button', { name: /add account/i }))

    // Same ambiguity as above: 'Savings' is also a static <option> label.
    expect(await screen.findByText('$500.00')).toBeInTheDocument()
    expect(api.createAccount).toHaveBeenCalledWith({
      name: 'Savings',
      type: 'savings',
      startingBalance: '500.00',
    })
  })
})
