import { useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/queryKeys'
import { listEnvelopes } from '../envelopes/api'
import { createGoal, deleteGoal, listGoals, type Goal } from './api'
import { Button, Card, Field, formatAmount, Input, Select } from '../../lib/ui'

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
    <Card title="Goals" className="h-full">
      <div className="space-y-4">
        <ul className="space-y-3">
          {goals.map((goal) => (
            <li key={goal.id} className="space-y-2 rounded-md border border-paper-100 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-paper-900">{goal.envelope_name}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(goal.id)}
                  className="text-xs text-paper-400 hover:text-[var(--color-money-negative)]"
                >
                  Remove
                </button>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-paper-200">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${goal.percent_complete}%`,
                    backgroundColor: goal.achieved ? 'var(--color-money-positive)' : 'var(--color-teal-600)',
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-paper-500">
                <span>
                  {formatAmount(goal.current_balance)} of {formatAmount(goal.target_amount)} (
                  {goal.percent_complete}%)
                </span>
                <span>Target: {goal.target_date}</span>
              </div>
              {goal.achieved ? (
                <p className="text-xs font-medium text-[var(--color-money-positive)]">Goal achieved!</p>
              ) : (
                <p className="text-xs text-paper-500">
                  Suggested: {formatAmount(goal.suggested_monthly_contribution)}/mo for {goal.months_remaining} more
                  month{goal.months_remaining === 1 ? '' : 's'}
                </p>
              )}
            </li>
          ))}
        </ul>

        {error && <p className="text-sm text-[var(--color-money-negative)]">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <Field label="Envelope" htmlFor={envelopeFieldId}>
            <Select
              id={envelopeFieldId}
              value={envelopeId}
              onChange={(e) => setEnvelopeIdChoice(Number(e.target.value))}
            >
              {envelopes.map((envelope) => (
                <option key={envelope.id} value={envelope.id}>
                  {envelope.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Target amount" htmlFor={amountId}>
            <Input
              id={amountId}
              required
              inputMode="decimal"
              placeholder="1000.00"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="w-28"
            />
          </Field>

          <Field label="Target date" htmlFor={dateId}>
            <Input
              id={dateId}
              type="date"
              required
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </Field>

          <Button type="submit" disabled={createMutation.isPending}>
            Add goal
          </Button>
        </form>
      </div>
    </Card>
  )
}
