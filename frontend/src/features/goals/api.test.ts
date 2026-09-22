import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGoal, deleteGoal, listGoals } from './api'

describe('listGoals', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fetches from the goals endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
    vi.stubGlobal('fetch', fetchMock)

    await listGoals()

    expect(fetchMock.mock.calls[0][0]).toContain('/api/goals')
  })
})

describe('createGoal', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('posts the new goal payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 1,
          envelope_id: 2,
          envelope_name: 'Emergency Fund',
          target_amount: '1000.00',
          target_date: '2026-12-01',
          current_balance: '0.00',
          remaining: '1000.00',
          months_remaining: 11,
          suggested_monthly_contribution: '90.91',
          percent_complete: '0.00',
          achieved: false,
        }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const goal = await createGoal({ envelopeId: 2, targetAmount: '1000.00', targetDate: '2026-12-01' })

    expect(goal.id).toBe(1)
    const [, options] = fetchMock.mock.calls[0]
    expect(JSON.parse(options.body)).toEqual({
      envelope_id: 2,
      target_amount: '1000.00',
      target_date: '2026-12-01',
    })
  })
})

describe('deleteGoal', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends a delete request for the given goal id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    vi.stubGlobal('fetch', fetchMock)

    await deleteGoal(1)

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/goals/1')
    expect(options.method).toBe('DELETE')
  })
})
