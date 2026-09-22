import { afterEach, describe, expect, it, vi } from 'vitest'
import { uploadImport } from './api'

describe('uploadImport', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('posts the account id and file as form data', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          batch: { id: 1, account_id: 3, filename: 'sample.csv', imported_count: 1, duplicate_count: 0 },
          created: [],
        }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const file = new File(['Date,Description,Amount\n'], 'sample.csv', { type: 'text/csv' })

    const result = await uploadImport(3, file)

    expect(result.batch.imported_count).toBe(1)
    const [, options] = fetchMock.mock.calls[0]
    const body = options.body as FormData
    expect(body.get('account_id')).toBe('3')
    expect(body.get('file')).toBe(file)
  })
})
