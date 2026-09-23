import { useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/queryKeys'
import { listEnvelopes } from '../envelopes/api'
import { createGoal, deleteGoal, listGoals, type Goal } from './api'

export function GoalsPanel() {
  const envelopeFieldId = useId()
  const amountId = useId()
  const dateId = useId()
  const queryClient = useQueryClient()

  const { data: envelopes = [] } = useQuery({ queryKey: queryKeys.envelopes, queryFn: listEnvelopes })
  const { data: goals = [] } = useQuery({ queryKey: queryKeys.goals, queryFn: listGoals })

  const [envelopeIdChoice, setEnvelopeIdChoice] = useState<number | ''>('')
  const [targetAmount, setTargetAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  const envelopeId: number | '' = envelopeIdChoice || (envelopes[0]?.id ?? '')

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof createGoal>[0]) => createGoal(input),
    onSuccess: (goal) => {
      queryClient.setQueryData<Goal[]>(queryKeys.goals, (prev = []) => [...prev, goal])
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (goalId: number) => deleteGoal(goalId),
    onSuccess: (_data, goalId) => {
      queryClient.setQueryData<Goal[]>(queryKeys.goals, (prev = []) =>
        prev.filter((goal) => goal.id !== goalId),
      )
    },
  })

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (envelopeId === '') return
    setError(null)
    try {
      await createMutation.mutateAsync({ envelopeId, targetAmount, targetDate })
      setTargetAmount('')
      setTargetDate('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create goal.')
    }
  }

  async function handleDelete(goalId: number) {
    await deleteMutation.mutateAsync(goalId)
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Goals</h2>

      <ul className="space-y-3">
        {goals.map((goal) => (
          <li key={goal.id} className="space-y-1 rounded-md border border-slate-100 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-900">{goal.envelope_name}</span>
              <button
                type="button"
                onClick={() => handleDelete(goal.id)}
                className="text-xs text-slate-400 hover:text-red-600"
              >
                Remove
              </button>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${goal.achieved ? 'bg-emerald-500' : 'bg-slate-900'}`}
                style={{ width: `${goal.percent_complete}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                {goal.current_balance} of {goal.target_amount} ({goal.percent_complete}%)
              </span>
              <span>Target: {goal.target_date}</span>
            </div>
            {goal.achieved ? (
              <p className="text-xs font-medium text-emerald-600">Goal achieved!</p>
            ) : (
              <p className="text-xs text-slate-500">
                Suggested: {goal.suggested_monthly_contribution}/mo for {goal.months_remaining}{' '}
                more month{goal.months_remaining === 1 ? '' : 's'}
              </p>
            )}
          </li>
        ))}
      </ul>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor={envelopeFieldId} className="block text-xs font-medium text-slate-500">
            Envelope
          </label>
          <select
            id={envelopeFieldId}
            value={envelopeId}
            onChange={(e) => setEnvelopeIdChoice(Number(e.target.value))}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          >
            {envelopes.map((envelope) => (
              <option key={envelope.id} value={envelope.id}>
                {envelope.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor={amountId} className="block text-xs font-medium text-slate-500">
            Target amount
          </label>
          <input
            id={amountId}
            required
            inputMode="decimal"
            placeholder="1000.00"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor={dateId} className="block text-xs font-medium text-slate-500">
            Target date
          </label>
          <input
            id={dateId}
            type="date"
            required
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          Add goal
        </button>
      </form>
    </section>
  )
}
