import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEnvelope, listEnvelopes } from './api'

describe('listEnvelopes', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fetches from the envelopes endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
    vi.stubGlobal('fetch', fetchMock)

    await listEnvelopes()

    expect(fetchMock.mock.calls[0][0]).toContain('/api/envelopes')
  })
})

describe('createEnvelope', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('posts the new envelope payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, name: 'Groceries', group_name: null }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const envelope = await createEnvelope({ name: 'Groceries' })

    expect(envelope.id).toBe(1)
    const [, options] = fetchMock.mock.calls[0]
    expect(JSON.parse(options.body)).toEqual({ name: 'Groceries' })
  })
})
