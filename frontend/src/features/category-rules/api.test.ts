import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCategoryRule, listCategoryRules } from './api'

describe('listCategoryRules', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fetches from the category-rules endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
    vi.stubGlobal('fetch', fetchMock)

    await listCategoryRules()

    expect(fetchMock.mock.calls[0][0]).toContain('/api/category-rules')
  })
})

describe('createCategoryRule', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('posts the new rule payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ id: 1, envelope_id: 2, match_type: 'contains', pattern: 'trader joe', priority: 0 }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const rule = await createCategoryRule({ envelopeId: 2, pattern: 'trader joe' })

    expect(rule.id).toBe(1)
    const [, options] = fetchMock.mock.calls[0]
    expect(JSON.parse(options.body)).toEqual({ envelope_id: 2, pattern: 'trader joe' })
  })
})
