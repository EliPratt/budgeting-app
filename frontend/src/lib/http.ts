const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface ApiFetchOptions {
  method?: string
  body?: unknown
}

async function parseErrorDetail(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.detail === 'string') return data.detail
  } catch {
    // fall through to generic message
  }
  return `Request failed: ${response.status}`
}

export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response))
  }
  if (response.status === 204) {
    return undefined as T
  }
  return response.json()
}
