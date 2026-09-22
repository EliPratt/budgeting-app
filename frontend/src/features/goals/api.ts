import { apiFetch } from '../../lib/http'

export interface Goal {
  id: number
  envelope_id: number
  envelope_name: string
  target_amount: string
  target_date: string
  current_balance: string
  remaining: string
  months_remaining: number
  suggested_monthly_contribution: string
  percent_complete: string
  achieved: boolean
}

export interface CreateGoalInput {
  envelopeId: number
  targetAmount: string
  targetDate: string
}

export async function listGoals(): Promise<Goal[]> {
  return apiFetch('/api/goals')
}

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  return apiFetch('/api/goals', {
    method: 'POST',
    body: {
      envelope_id: input.envelopeId,
      target_amount: input.targetAmount,
      target_date: input.targetDate,
    },
  })
}

export async function deleteGoal(goalId: number): Promise<void> {
  await apiFetch(`/api/goals/${goalId}`, { method: 'DELETE' })
}
