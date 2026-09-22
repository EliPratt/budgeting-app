import { afterEach, describe, expect, it, vi } from 'vitest'
import { confirmRecurringBill, createRecurringBill, listDueBills, listRecurringBills } from './api'

describe('listRecurringBills', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fetches from the recurring-bills endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
    vi.stubGlobal('fetch', fetchMock)

    await listRecurringBills()

    expect(fetchMock.mock.calls[0][0]).toContain('/api/recurring-bills')
  })
})

describe('listDueBills', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fetches the due sub-resource', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
    vi.stubGlobal('fetch', fetchMock)

    await listDueBills()

    expect(fetchMock.mock.calls[0][0]).toContain('/api/recurring-bills/due')
  })
})

describe('createRecurringBill', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('posts the new bill payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 1,
          name: 'Rent',
          account_id: 1,
          envelope_id: 2,
          amount: '-1200.00',
          frequency: 'monthly',
          next_due_date: '2026-01-15',
        }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const bill = await createRecurringBill({
      name: 'Rent',
      accountId: 1,
      envelopeId: 2,
      amount: '-1200.00',
      frequency: 'monthly',
      nextDueDate: '2026-01-15',
    })

    expect(bill.id).toBe(1)
    const [, options] = fetchMock.mock.calls[0]
    expect(JSON.parse(options.body)).toEqual({
      name: 'Rent',
      account_id: 1,
      envelope_id: 2,
      amount: '-1200.00',
      frequency: 'monthly',
      next_due_date: '2026-01-15',
    })
  })
})

describe('confirmRecurringBill', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('posts to the confirm endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          bill: {
            id: 1,
            name: 'Rent',
            account_id: 1,
            envelope_id: 2,
            amount: '-1200.00',
            frequency: 'monthly',
            next_due_date: '2026-02-15',
          },
          transaction: {
            id: 9,
            account_id: 1,
            envelope_id: 2,
            date: '2026-01-15',
            amount: '-1200.00',
            payee: 'Rent',
            source: 'recurring',
          },
        }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await confirmRecurringBill(1)

    expect(result.transaction.payee).toBe('Rent')
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/recurring-bills/1/confirm')
    expect(options.method).toBe('POST')
  })
})
