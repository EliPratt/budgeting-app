import { AccountsPanel } from '../accounts/AccountsPanel'
import type { User } from '../../lib/api'
import { EnvelopesPanel } from '../envelopes/EnvelopesPanel'
import { TransactionsPanel } from '../transactions/TransactionsPanel'

interface DashboardProps {
  user: User
  onLogout: () => void
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-900">Budgeting App</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">{user.email}</span>
          <button
            onClick={onLogout}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 p-6">
        <AccountsPanel />
        <EnvelopesPanel />
        <TransactionsPanel />
      </main>
    </div>
  )
}
