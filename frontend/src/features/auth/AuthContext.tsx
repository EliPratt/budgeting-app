import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as api from '../../lib/api'
import type { User } from '../../lib/api'
import { queryClient } from '../../lib/queryClient'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .getMe()
      .then(setUser)
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const loggedInUser = await api.login(email, password)
    setUser(loggedInUser)
  }

  async function logout() {
    await api.logout()
    setUser(null)
    // Account balances, transactions, and other financial data cached by
    // react-query must not linger in memory past an explicit logout.
    queryClient.clear()
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
