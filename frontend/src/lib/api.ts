import { apiFetch } from './http'

export interface User {
  email: string
}

export async function getHealth(): Promise<{ status: string }> {
  return apiFetch('/api/health')
}

export async function login(email: string, password: string): Promise<User> {
  return apiFetch('/api/auth/login', { method: 'POST', body: { email, password } })
}

export async function logout(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' })
}

export async function getMe(): Promise<User | null> {
  try {
    return await apiFetch<User>('/api/auth/me')
  } catch {
    return null
  }
}
