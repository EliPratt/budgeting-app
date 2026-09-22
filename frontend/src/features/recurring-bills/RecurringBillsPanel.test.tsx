import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as accountsApi from '../accounts/api'
import * as envelopesApi from '../envelopes/api'
import * as billsApi from './api'
import { RecurringBillsPanel } from './RecurringBillsPanel'

const ACCOUNTS = [
  { id: 1, name: 'Checking', type: 'checking' as const, starting_balance: '0.00', balance: '0.00' },
]
const ENVELOPES = [{ id: 2, name: 'Bills', group_name: null }]

const BILL = {
  id: 1,
  name: 'Rent',
  account_id: 1,
  envelope_id: 2,
  amount: '-1200.00',
  frequency: 'monthly' as const,
  next_due_date: '2026-01-15',
}

function setup() {
  vi.spyOn(accountsApi, 'listAccounts').mockResolvedValue(ACCOUNTS)
  vi.spyOn(envelopesApi, 'listEnvelopes').mockResolvedValue(ENVELOPES)
}

describe('RecurringBillsPanel', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows all recurring bills', async () => {
    setup()
    vi.spyOn(billsApi, 'listRecurringBills').mockResolvedValue([BILL])
    vi.spyOn(billsApi, 'listDueBills').mockResolvedValue([])

    render(<RecurringBillsPanel />)

    expect(await screen.findByText('Rent')).toBeInTheDocument()
    expect(screen.getByText('Next: 2026-01-15')).toBeInTheDocument()
  })

  it('surfaces due bills with a confirm action', async () => {
    setup()
    vi.spyOn(billsApi, 'listRecurringBills').mockResolvedValue([BILL])
    vi.spyOn(billsApi, 'listDueBills').mockResolvedValue([BILL])

    render(<RecurringBillsPanel />)

    expect(await screen.findByText(/due now/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
  })

  it('confirming a due bill removes it from the due list', async () => {
    setup()
    vi.spyOn(billsApi, 'listRecurringBills').mockResolvedValue([BILL])
    vi.spyOn(billsApi, 'listDueBills').mockResolvedValue([BILL])
    vi.spyOn(billsApi, 'confirmRecurringBill').mockResolvedValue({
      bill: { ...BILL, next_due_date: '2026-02-15' },
      transaction: {
        id: 9,
        account_id: 1,
        envelope_id: 2,
        date: '2026-01-15',
        amount: '-1200.00',
        payee: 'Rent',
        source: 'recurring',
      },
    })

    render(<RecurringBillsPanel />)
    await screen.findByText(/due now/i)

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => expect(screen.queryByText(/due now/i)).not.toBeInTheDocument())
    expect(screen.getByText('Next: 2026-02-15')).toBeInTheDocument()
  })

  it('does not show the due-now section when nothing is due', async () => {
    setup()
    vi.spyOn(billsApi, 'listRecurringBills').mockResolvedValue([BILL])
    vi.spyOn(billsApi, 'listDueBills').mockResolvedValue([])

    render(<RecurringBillsPanel />)

    await screen.findByText('Rent')
    expect(screen.queryByText(/due now/i)).not.toBeInTheDocument()
  })

  it('adds a new recurring bill', async () => {
    setup()
    vi.spyOn(billsApi, 'listRecurringBills').mockResolvedValue([])
    vi.spyOn(billsApi, 'listDueBills').mockResolvedValue([])
    vi.spyOn(billsApi, 'createRecurringBill').mockResolvedValue(BILL)

    render(<RecurringBillsPanel />)
    await screen.findByText('Checking')

    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Rent' } })
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '-1200.00' } })
    fireEvent.change(screen.getByLabelText(/next due date/i), { target: { value: '2026-01-15' } })
    fireEvent.click(screen.getByRole('button', { name: /add bill/i }))

    await waitFor(() =>
      expect(billsApi.createRecurringBill).toHaveBeenCalledWith({
        name: 'Rent',
        accountId: 1,
        envelopeId: 2,
        amount: '-1200.00',
        frequency: 'monthly',
        nextDueDate: '2026-01-15',
      }),
    )
    expect(await screen.findByText('Rent')).toBeInTheDocument()
  })
})
