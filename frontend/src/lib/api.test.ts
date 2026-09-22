import { afterEach, describe, expect, it, vi } from 'vitest'
import { getMe, login, logout } from './api'

describe('login', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends credentials and returns the user on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ email: 'owner@example.com' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const user = await login('owner@example.com', 'correct-password')

    expect(user).toEqual({ email: 'owner@example.com' })
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/auth/login')
    expect(options.credentials).toBe('include')
    expect(JSON.parse(options.body)).toEqual({
      email: 'owner@example.com',
      password: 'correct-password',
    })
  })

  it('throws with the server message on invalid credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ detail: 'Incorrect email or password' }),
      }),
    )

    await expect(login('owner@example.com', 'wrong')).rejects.toThrow(
      'Incorrect email or password',
    )
  })
})

describe('getMe', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null when not authenticated', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    expect(await getMe()).toBeNull()
  })

  it('returns the user when authenticated', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ email: 'a@b.com' }) }),
    )
    expect(await getMe()).toEqual({ email: 'a@b.com' })
  })
})

describe('logout', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts to the logout endpoint with credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    vi.stubGlobal('fetch', fetchMock)

    await logout()

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/auth/logout')
    expect(options.credentials).toBe('include')
  })
})
