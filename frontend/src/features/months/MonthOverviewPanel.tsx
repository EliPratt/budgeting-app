import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/queryKeys'
import { assignEnvelopeMonth, getMonthOverview, type MonthOverview, type MonthSummary } from './api'

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
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Budget</h2>
        <div className="flex items-center gap-2 text-sm">
          <button
            aria-label="Previous month"
            onClick={() => goToMonth(-1)}
            className="rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-50"
          >
            ←
          </button>
          <span className="w-32 text-center font-medium text-slate-700">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            aria-label="Next month"
            onClick={() => goToMonth(1)}
            className="rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-50"
          >
            Next →
          </button>
        </div>
      </div>

      {overview && (
        <>
          <div
            className={`rounded-md px-3 py-2 text-sm ${
              overview.summary.balanced
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            {summaryMessage(overview.summary)}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                <th className="pb-2 font-medium">Envelope</th>
                <th className="pb-2 font-medium">Assigned</th>
                <th className="pb-2 font-medium">Activity</th>
                <th className="pb-2 font-medium">Available</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {overview.envelopes.map((envelope) => (
                <tr key={envelope.id}>
                  <td className="py-2 text-slate-700">{envelope.name}</td>
                  <td className="py-2">
                    <label className="sr-only" htmlFor={`assigned-${envelope.id}`}>
                      Assigned amount for {envelope.name}
                    </label>
                    <input
                      id={`assigned-${envelope.id}`}
                      value={drafts[envelope.id] ?? ''}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [envelope.id]: e.target.value }))
                      }
                      onBlur={() => handleAssign(envelope.id)}
                      className="w-24 rounded-md border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className="py-2 text-slate-500">{envelope.activity}</td>
                  <td className="py-2 font-medium text-slate-900">{envelope.available}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  )
}
