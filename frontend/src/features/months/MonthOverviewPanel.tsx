import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/queryKeys'
import { assignEnvelopeMonth, getMonthOverview, type MonthOverview, type MonthSummary } from './api'
import { Amount, Card, Input } from '../../lib/ui'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

interface MonthOverviewPanelProps {
  initialYear?: number
  initialMonth?: number
}

function summaryMessage(summary: MonthSummary): string {
  if (summary.balanced) return 'Every dollar has a job this month.'
  const toBeAssigned = Number(summary.to_be_assigned)
  if (toBeAssigned < 0) {
    return `Over-assigned by $${Math.abs(toBeAssigned).toFixed(2)}.`
  }
  return `Not fully assigned — $${summary.to_be_assigned} left to assign.`
}

function shiftMonth(year: number, month: number, delta: number): [number, number] {
  const zeroBased = month - 1 + delta
  const newYear = year + Math.floor(zeroBased / 12)
  const newMonth = ((zeroBased % 12) + 12) % 12
  return [newYear, newMonth + 1]
}

export function MonthOverviewPanel({ initialYear, initialMonth }: MonthOverviewPanelProps = {}) {
  const now = new Date()
  const [year, setYear] = useState(initialYear ?? now.getFullYear())
  const [month, setMonth] = useState(initialMonth ?? now.getMonth() + 1)
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const queryClient = useQueryClient()

  const { data: overview } = useQuery({
    queryKey: queryKeys.monthOverview(year, month),
    queryFn: () => getMonthOverview(year, month),
  })

  useEffect(() => {
    if (overview) {
      setDrafts(Object.fromEntries(overview.envelopes.map((e) => [e.id, e.assigned])))
    }
  }, [overview])

  function goToMonth(delta: number) {
    const [newYear, newMonth] = shiftMonth(year, month, delta)
    setYear(newYear)
    setMonth(newMonth)
  }

  const assignMutation = useMutation({
    mutationFn: ({ envelopeId, draft }: { envelopeId: number; draft: string }) =>
      assignEnvelopeMonth(year, month, envelopeId, draft),
    onSuccess: (updated) => {
      queryClient.setQueryData<MonthOverview>(queryKeys.monthOverview(year, month), (prev) =>
        prev
          ? { ...prev, envelopes: prev.envelopes.map((e) => (e.id === updated.id ? updated : e)) }
          : prev,
      )
    },
  })

  async function handleAssign(envelopeId: number) {
    const draft = drafts[envelopeId]
    await assignMutation.mutateAsync({ envelopeId, draft })
  }

  return (
    <Card
      title="Budget"
      emphasis
      action={
        <div className="flex items-center gap-2 text-sm">
          <button
            aria-label="Previous month"
            onClick={() => goToMonth(-1)}
            className="rounded-md border border-paper-300 px-2 py-1 text-paper-600 hover:bg-paper-50"
          >
            ←
          </button>
          <span className="w-32 text-center font-medium text-paper-700">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            aria-label="Next month"
            onClick={() => goToMonth(1)}
            className="rounded-md border border-paper-300 px-2 py-1 text-paper-600 hover:bg-paper-50"
          >
            Next →
          </button>
        </div>
      }
    >
      {overview && (
        <div className="space-y-4">
          <div
            className={`rounded-md px-3 py-2 text-sm ${
              overview.summary.balanced
                ? 'bg-teal-50 text-teal-700'
                : 'bg-amber-50 text-amber-800'
            }`}
          >
            {summaryMessage(overview.summary)}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-paper-400">
                <th className="pb-2 font-medium">Envelope</th>
                <th className="pb-2 font-medium">Assigned</th>
                <th className="pb-2 text-right font-medium">Available</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-100">
              {overview.envelopes.map((envelope) => {
                const spent = Math.abs(Number(envelope.activity))
                const assignedNum = Number(envelope.assigned)
                const overspent = assignedNum > 0 ? spent > assignedNum : spent > 0
                const pct = assignedNum > 0 ? Math.min(100, (spent / assignedNum) * 100) : overspent ? 100 : 0

                return (
                  <tr key={envelope.id}>
                    <td className="py-3 align-top">
                      <div className="font-medium text-paper-700">{envelope.name}</div>
                      <div className="mt-1.5 h-1.5 w-40 max-w-full overflow-hidden rounded-full bg-paper-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: overspent
                              ? 'var(--color-money-negative)'
                              : 'var(--color-teal-400)',
                          }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-paper-400">
                        <Amount value={envelope.activity ? spent : 0} /> spent of{' '}
                        <Amount value={envelope.assigned} />
                      </div>
                    </td>
                    <td className="py-3 align-top">
                      <label className="sr-only" htmlFor={`assigned-${envelope.id}`}>
                        Assigned amount for {envelope.name}
                      </label>
                      <Input
                        id={`assigned-${envelope.id}`}
                        value={drafts[envelope.id] ?? ''}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [envelope.id]: e.target.value }))
                        }
                        onBlur={() => handleAssign(envelope.id)}
                        className="w-24"
                      />
                    </td>
                    <td className="py-3 text-right align-top font-medium text-paper-900">
                      <Amount value={envelope.available} signed />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
