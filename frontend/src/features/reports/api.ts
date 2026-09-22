import { apiFetch } from '../../lib/http'

export interface CategorySpending {
  envelope_id: number | null
  envelope_name: string
  total: string
}

export interface MonthlyTrendPoint {
  month: string
  income: string
  expense: string
}

export interface NetWorthPoint {
  month: string
  net_worth: string
}

export interface SpendingByCategoryFilter {
  start?: string
  end?: string
}

export async function getSpendingByCategory(
  filter: SpendingByCategoryFilter = {},
): Promise<CategorySpending[]> {
  const params = new URLSearchParams()
  if (filter.start) params.set('start', filter.start)
  if (filter.end) params.set('end', filter.end)
  const query = params.toString()
  return apiFetch(`/api/reports/spending-by-category${query ? `?${query}` : ''}`)
}

export async function getIncomeVsExpenseTrend(months = 6): Promise<MonthlyTrendPoint[]> {
  return apiFetch(`/api/reports/income-vs-expense?months=${months}`)
}

export async function getNetWorthTrend(months = 6): Promise<NetWorthPoint[]> {
  return apiFetch(`/api/reports/net-worth?months=${months}`)
}
