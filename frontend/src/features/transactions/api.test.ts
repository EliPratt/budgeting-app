import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTransaction, listTransactions } from './api'

describe('listTransactions', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fetches from the transactions endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
    vi.stubGlobal('fetch', fetchMock)

    await listTransactions()

    expect(fetchMock.mock.calls[0][0]).toContain('/api/transactions')
  })

  it('filters by account when given an accountId', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
    vi.stubGlobal('fetch', fetchMock)

    await listTransactions({ accountId: 5 })

    expect(fetchMock.mock.calls[0][0]).toContain('account_id=5')
  })
})

describe('createTransaction', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('posts the new transaction payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 1,
          account_id: 1,
          envelope_id: null,
          date: '2026-01-05',
          amount: '-25.00',
          payee: 'Trader Joes',
          source: 'manual',
        }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const transaction = await createTransaction({
      accountId: 1,
      date: '2026-01-05',
      amount: '-25.00',
      payee: 'Trader Joes',
    })

    expect(transaction.id).toBe(1)
    const [, options] = fetchMock.mock.calls[0]
    expect(JSON.parse(options.body)).toEqual({
      account_id: 1,
      date: '2026-01-05',
      amount: '-25.00',
      payee: 'Trader Joes',
    })
  })
})
