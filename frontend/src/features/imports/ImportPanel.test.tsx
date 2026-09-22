import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as accountsApi from '../accounts/api'
import * as envelopesApi from '../envelopes/api'
import * as transactionsApi from '../transactions/api'
import * as categoryRulesApi from '../category-rules/api'
import * as importsApi from './api'
import { ImportPanel } from './ImportPanel'

const ACCOUNTS = [
  { id: 1, name: 'Checking', type: 'checking' as const, starting_balance: '0.00', balance: '0.00' },
]
const ENVELOPES = [{ id: 1, name: 'Groceries', group_name: null }]

const IMPORT_RESULT = {
  batch: { id: 1, account_id: 1, filename: 'sample.csv', imported_count: 2, duplicate_count: 1 },
  created: [
    {
      id: 10,
      account_id: 1,
      envelope_id: 1,
      date: '2026-01-05',
      amount: '-42.50',
      payee: 'Trader Joes',
      source: 'import' as const,
    },
    {
      id: 11,
      account_id: 1,
      envelope_id: null,
      date: '2026-01-06',
      amount: '1500.00',
      payee: 'Paycheck',
      source: 'import' as const,
    },
  ],
}

function setup() {
  vi.spyOn(accountsApi, 'listAccounts').mockResolvedValue(ACCOUNTS)
  vi.spyOn(envelopesApi, 'listEnvelopes').mockResolvedValue(ENVELOPES)
}

describe('ImportPanel', () => {
  afterEach(() => vi.restoreAllMocks())

  it('uploads the selected file for the selected account and shows a summary', async () => {
    setup()
    const uploadSpy = vi.spyOn(importsApi, 'uploadImport').mockResolvedValue(IMPORT_RESULT)

    render(<ImportPanel />)
    await screen.findByText('Checking')

    const file = new File(['Date,Description,Amount\n'], 'sample.csv', { type: 'text/csv' })
    const fileInput = screen.getByLabelText(/csv or ofx file/i)
    fireEvent.change(fileInput, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: /upload/i }))

    await waitFor(() => expect(uploadSpy).toHaveBeenCalledWith(1, file))
    expect(await screen.findByText(/imported 2 transactions/i)).toBeInTheDocument()
    expect(screen.getByText(/skipped 1 duplicate/i)).toBeInTheDocument()
  })

  it('shows the imported rows with the auto-categorized envelope preselected', async () => {
    setup()
    vi.spyOn(importsApi, 'uploadImport').mockResolvedValue(IMPORT_RESULT)

    render(<ImportPanel />)
    await screen.findByText('Checking')
    const file = new File(['x'], 'sample.csv', { type: 'text/csv' })
    fireEvent.change(screen.getByLabelText(/csv or ofx file/i), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: /upload/i }))

    expect(await screen.findByText('Trader Joes')).toBeInTheDocument()
    const groceriesSelect = screen.getByLabelText(/envelope for trader joes/i) as HTMLSelectElement
    expect(groceriesSelect.value).toBe('1')
    const paycheckSelect = screen.getByLabelText(/envelope for paycheck/i) as HTMLSelectElement
    expect(paycheckSelect.value).toBe('')
  })

  it('assigns an envelope to an uncategorized row and optionally saves a rule', async () => {
    setup()
    vi.spyOn(importsApi, 'uploadImport').mockResolvedValue(IMPORT_RESULT)
    const updateSpy = vi.spyOn(transactionsApi, 'updateTransaction').mockResolvedValue({
      id: 11,
      account_id: 1,
      envelope_id: 1,
      date: '2026-01-06',
      amount: '1500.00',
      payee: 'Paycheck',
      source: 'import',
    })
    const ruleSpy = vi.spyOn(categoryRulesApi, 'createCategoryRule').mockResolvedValue({
      id: 5,
      envelope_id: 1,
      match_type: 'contains',
      pattern: 'Paycheck',
      priority: 0,
    })

    render(<ImportPanel />)
    await screen.findByText('Checking')
    const file = new File(['x'], 'sample.csv', { type: 'text/csv' })
    fireEvent.change(screen.getByLabelText(/csv or ofx file/i), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: /upload/i }))
    await screen.findByText('Paycheck')

    fireEvent.change(screen.getByLabelText(/envelope for paycheck/i), { target: { value: '1' } })
    fireEvent.click(screen.getByLabelText(/save a rule for paycheck/i))
    const rows = screen.getAllByRole('button', { name: /save/i })
    fireEvent.click(rows[1])

    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith(11, { envelopeId: 1 }))
    expect(ruleSpy).toHaveBeenCalledWith({ envelopeId: 1, pattern: 'Paycheck' })
  })
})
