import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './http'

describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends credentials and parses the JSON response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1 }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await apiFetch('/api/accounts')

    expect(result).toEqual({ id: 1 })
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/accounts')
    expect(options.credentials).toBe('include')
  })

  it('sends a JSON body with the right content type', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/api/accounts', { method: 'POST', body: { name: 'Checking' } })

    const [, options] = fetchMock.mock.calls[0]
    expect(options.method).toBe('POST')
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(options.body)).toEqual({ name: 'Checking' })
  })

  it('throws with the server-provided detail message on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ detail: 'Account not found' }),
      }),
    )

    await expect(apiFetch('/api/accounts/999')).rejects.toThrow('Account not found')
  })

  it('falls back to a generic message when the error body has no detail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('not json')),
      }),
    )

    await expect(apiFetch('/api/accounts')).rejects.toThrow('Request failed: 500')
  })

  it('returns undefined for a 204 No Content response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }))
    expect(await apiFetch('/api/accounts/1', { method: 'DELETE' })).toBeUndefined()
  })
})
