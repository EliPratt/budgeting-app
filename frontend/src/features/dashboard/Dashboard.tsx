import { lazy, Suspense } from 'react'
import { AccountsPanel } from '../accounts/AccountsPanel'
import type { User } from '../../lib/api'
import { EnvelopesPanel } from '../envelopes/EnvelopesPanel'
import { GoalsPanel } from '../goals/GoalsPanel'
import { ImportPanel } from '../imports/ImportPanel'
import { MonthOverviewPanel } from '../months/MonthOverviewPanel'
import { RecurringBillsPanel } from '../recurring-bills/RecurringBillsPanel'
import { TransactionsPanel } from '../transactions/TransactionsPanel'

const ReportsPanel = lazy(() =>
  import('../reports/ReportsPanel').then((module) => ({ default: module.ReportsPanel })),
)

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
        <MonthOverviewPanel />
        <AccountsPanel />
        <EnvelopesPanel />
        <GoalsPanel />
        <RecurringBillsPanel />
        <ImportPanel />
        <TransactionsPanel />
        <Suspense
          fallback={
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-400 shadow-sm">
              Loading reports…
            </div>
          }
        >
          <ReportsPanel />
        </Suspense>
      </main>
    </div>
  )
}
