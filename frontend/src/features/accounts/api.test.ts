import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAccount, listAccounts } from './api'

describe('listAccounts', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fetches from the accounts endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
    vi.stubGlobal('fetch', fetchMock)

    await listAccounts()

    expect(fetchMock.mock.calls[0][0]).toContain('/api/accounts')
  })
})

describe('createAccount', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('posts the new account payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 1,
          name: 'Checking',
          type: 'checking',
          starting_balance: '100.00',
          balance: '100.00',
        }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const account = await createAccount({ name: 'Checking', type: 'checking', startingBalance: '100.00' })

    expect(account.id).toBe(1)
    const [, options] = fetchMock.mock.calls[0]
    expect(JSON.parse(options.body)).toEqual({
      name: 'Checking',
      type: 'checking',
      starting_balance: '100.00',
    })
  })
})
