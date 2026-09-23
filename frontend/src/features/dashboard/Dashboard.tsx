import { lazy, Suspense } from 'react'
import { AccountsPanel } from '../accounts/AccountsPanel'
import type { User } from '../../lib/api'
import { EnvelopesPanel } from '../envelopes/EnvelopesPanel'
import { GoalsPanel } from '../goals/GoalsPanel'
import { ImportPanel } from '../imports/ImportPanel'
import { MonthOverviewPanel } from '../months/MonthOverviewPanel'
import { RecurringBillsPanel } from '../recurring-bills/RecurringBillsPanel'
import { TransactionsPanel } from '../transactions/TransactionsPanel'
import { Button } from '../../lib/ui'

const ReportsPanel = lazy(() =>
  import('../reports/ReportsPanel').then((module) => ({ default: module.ReportsPanel })),
)

interface DashboardProps {
  user: User
  onLogout: () => void
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  return (
    <div className="min-h-screen bg-paper-100">
      <header className="border-b border-teal-800 bg-teal-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="font-display text-lg font-semibold text-white">Budgeting App</h1>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-teal-200">{user.email}</span>
            <Button variant="secondary" onClick={onLogout} className="border-teal-600 text-teal-100 hover:bg-teal-800">
              Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <MonthOverviewPanel />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <EnvelopesPanel />
          </div>
          <AccountsPanel />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <GoalsPanel />
          <RecurringBillsPanel />
        </div>

        <ImportPanel />
        <TransactionsPanel />

        <Suspense
          fallback={
            <div className="rounded-lg border border-paper-200 bg-white p-6 text-sm text-paper-400">
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
