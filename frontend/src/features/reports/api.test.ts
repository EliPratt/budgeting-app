import { afterEach, describe, expect, it, vi } from 'vitest'
import { getIncomeVsExpenseTrend, getNetWorthTrend, getSpendingByCategory } from './api'

describe('getSpendingByCategory', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fetches from the spending-by-category endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
    vi.stubGlobal('fetch', fetchMock)

    await getSpendingByCategory()

    expect(fetchMock.mock.calls[0][0]).toContain('/api/reports/spending-by-category')
  })

  it('includes start and end when given a range', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
    vi.stubGlobal('fetch', fetchMock)

    await getSpendingByCategory({ start: '2026-01-01', end: '2026-02-01' })

    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('start=2026-01-01')
    expect(url).toContain('end=2026-02-01')
  })
})

describe('getIncomeVsExpenseTrend', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fetches the trend with the requested number of months', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
    vi.stubGlobal('fetch', fetchMock)

    await getIncomeVsExpenseTrend(3)

    expect(fetchMock.mock.calls[0][0]).toContain('months=3')
  })
})

describe('getNetWorthTrend', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fetches the trend with the requested number of months', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
    vi.stubGlobal('fetch', fetchMock)

    await getNetWorthTrend(12)

    expect(fetchMock.mock.calls[0][0]).toContain('months=12')
  })
})
