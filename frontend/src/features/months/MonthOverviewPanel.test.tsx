import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithClient } from '../../test/render'
import * as api from './api'
import { MonthOverviewPanel } from './MonthOverviewPanel'

const OVERVIEW = {
  year: 2026,
  month: 1,
  envelopes: [
    {
      id: 1,
      name: 'Groceries',
      group_name: null,
      assigned: '200.00',
      activity: '-25.00',
      available: '175.00',
    },
  ],
  summary: {
    total_income: '1000.00',
    total_assigned: '200.00',
    to_be_assigned: '800.00',
    balanced: false,
  },
}

describe('MonthOverviewPanel', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows the envelope rows and the month summary', async () => {
    vi.spyOn(api, 'getMonthOverview').mockResolvedValue(OVERVIEW)

    renderWithClient(<MonthOverviewPanel />)

    expect(await screen.findByText('Groceries')).toBeInTheDocument()
    expect(screen.getByText('175.00')).toBeInTheDocument()
    expect(screen.getByText(/not fully assigned/i)).toBeInTheDocument()
  })

  it('shows a balanced message when to_be_assigned is zero', async () => {
    vi.spyOn(api, 'getMonthOverview').mockResolvedValue({
      ...OVERVIEW,
      summary: { ...OVERVIEW.summary, to_be_assigned: '0.00', balanced: true },
    })

    renderWithClient(<MonthOverviewPanel />)

    expect(await screen.findByText(/every dollar/i)).toBeInTheDocument()
  })

  it('shows an over-assigned message when to_be_assigned is negative', async () => {
    vi.spyOn(api, 'getMonthOverview').mockResolvedValue({
      ...OVERVIEW,
      summary: { ...OVERVIEW.summary, to_be_assigned: '-200.00', balanced: false },
    })

    renderWithClient(<MonthOverviewPanel />)

    expect(await screen.findByText(/over-assigned by \$200.00/i)).toBeInTheDocument()
  })

  it('reassigns an envelope amount and refreshes the row', async () => {
    vi.spyOn(api, 'getMonthOverview').mockResolvedValue(OVERVIEW)
    vi.spyOn(api, 'assignEnvelopeMonth').mockResolvedValue({
      id: 1,
      name: 'Groceries',
      group_name: null,
      assigned: '300.00',
      activity: '-25.00',
      available: '275.00',
    })

    renderWithClient(<MonthOverviewPanel initialYear={2026} initialMonth={1} />)
    const input = await screen.findByLabelText(/assigned amount for groceries/i)
    await waitFor(() => expect(input).toHaveValue('200.00'))

    fireEvent.change(input, { target: { value: '300.00' } })
    fireEvent.blur(input)

    expect(await screen.findByText('275.00')).toBeInTheDocument()
    expect(api.assignEnvelopeMonth).toHaveBeenCalledWith(2026, 1, 1, '300.00')
  })

  it('moves to the next month when the next button is clicked', async () => {
    const overviewSpy = vi.spyOn(api, 'getMonthOverview').mockResolvedValue(OVERVIEW)

    renderWithClient(<MonthOverviewPanel initialYear={2026} initialMonth={1} />)
    await waitFor(() => expect(overviewSpy).toHaveBeenCalledWith(2026, 1))

    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => expect(overviewSpy).toHaveBeenCalledWith(2026, 2))
  })
})
