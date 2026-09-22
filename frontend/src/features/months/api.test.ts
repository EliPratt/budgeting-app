import { afterEach, describe, expect, it, vi } from 'vitest'
import { assignEnvelopeMonth, getMonthOverview } from './api'

describe('getMonthOverview', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fetches the overview for the given year and month', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          year: 2026,
          month: 1,
          envelopes: [],
          summary: { total_income: '0.00', total_assigned: '0.00', to_be_assigned: '0.00', balanced: true },
        }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await getMonthOverview(2026, 1)

    expect(fetchMock.mock.calls[0][0]).toContain('/api/months/2026/1')
  })
})

describe('assignEnvelopeMonth', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('puts the assigned amount for the given envelope and month', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 1,
          name: 'Groceries',
          group_name: null,
          assigned: '200.00',
          activity: '0.00',
          available: '200.00',
        }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await assignEnvelopeMonth(2026, 1, 1, '200.00')

    expect(result.assigned).toBe('200.00')
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/months/2026/1/envelopes/1')
    expect(options.method).toBe('PUT')
    expect(JSON.parse(options.body)).toEqual({ assigned_amount: '200.00' })
  })
})
