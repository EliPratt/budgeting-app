import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as reportsApi from './api'
import { ReportsPanel } from './ReportsPanel'

describe('ReportsPanel', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows a message instead of a chart when there is no spending yet', async () => {
    vi.spyOn(reportsApi, 'getSpendingByCategory').mockResolvedValue([])
    vi.spyOn(reportsApi, 'getIncomeVsExpenseTrend').mockResolvedValue([])
    vi.spyOn(reportsApi, 'getNetWorthTrend').mockResolvedValue([])

    render(<ReportsPanel />)

    expect(await screen.findByText(/no spending yet this month/i)).toBeInTheDocument()
    expect(screen.queryByTestId('spending-by-category-chart')).not.toBeInTheDocument()
  })

  it('renders the spending-by-category chart once data loads', async () => {
    vi.spyOn(reportsApi, 'getSpendingByCategory').mockResolvedValue([
      { envelope_id: 1, envelope_name: 'Groceries', total: '150.00' },
    ])
    vi.spyOn(reportsApi, 'getIncomeVsExpenseTrend').mockResolvedValue([
      { month: '2026-01', income: '1000.00', expense: '400.00' },
    ])
    vi.spyOn(reportsApi, 'getNetWorthTrend').mockResolvedValue([
      { month: '2026-01', net_worth: '2500.00' },
    ])

    render(<ReportsPanel />)

    expect(await screen.findByTestId('spending-by-category-chart')).toBeInTheDocument()
    expect(screen.getByTestId('income-vs-expense-chart')).toBeInTheDocument()
    expect(screen.getByTestId('net-worth-chart')).toBeInTheDocument()
  })
})
