import { apiFetch } from '../../lib/http'

export interface EnvelopeSummary {
  id: number
  name: string
  group_name: string | null
  assigned: string
  activity: string
  available: string
}

export interface MonthSummary {
  total_income: string
  total_assigned: string
  to_be_assigned: string
  balanced: boolean
}

export interface MonthOverview {
  year: number
  month: number
  envelopes: EnvelopeSummary[]
  summary: MonthSummary
}

export async function getMonthOverview(year: number, month: number): Promise<MonthOverview> {
  return apiFetch(`/api/months/${year}/${month}`)
}

export async function assignEnvelopeMonth(
  year: number,
  month: number,
  envelopeId: number,
  assignedAmount: string,
): Promise<EnvelopeSummary> {
  return apiFetch(`/api/months/${year}/${month}/envelopes/${envelopeId}`, {
    method: 'PUT',
    body: { assigned_amount: assignedAmount },
  })
}
