import { AuthProvider, useAuth } from './features/auth/AuthContext'
import { LoginForm } from './features/auth/LoginForm'
import { Dashboard } from './features/dashboard/Dashboard'

function AppShell() {
  const { user, loading, login, logout } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-400">Loading…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <LoginForm onSubmit={login} />
      </div>
    )
  }

  return <Dashboard user={user} onLogout={() => logout()} />
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}

export default App
