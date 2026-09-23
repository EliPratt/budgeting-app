import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithClient } from '../../test/render'
import * as envelopesApi from '../envelopes/api'
import * as goalsApi from './api'
import { GoalsPanel } from './GoalsPanel'

const ENVELOPES = [{ id: 2, name: 'Emergency Fund', group_name: null }]

const GOAL = {
  id: 1,
  envelope_id: 2,
  envelope_name: 'Emergency Fund',
  target_amount: '1000.00',
  target_date: '2026-12-01',
  current_balance: '250.00',
  remaining: '750.00',
  months_remaining: 6,
  suggested_monthly_contribution: '125.00',
  percent_complete: '25.00',
  achieved: false,
}

function setup() {
  vi.spyOn(envelopesApi, 'listEnvelopes').mockResolvedValue(ENVELOPES)
}

describe('GoalsPanel', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows goal progress details', async () => {
    setup()
    vi.spyOn(goalsApi, 'listGoals').mockResolvedValue([GOAL])

    renderWithClient(<GoalsPanel />)

    expect(await screen.findByText(/250\.00 of 1000\.00 \(25\.00%\)/)).toBeInTheDocument()
    expect(screen.getByText(/suggested: 125\.00\/mo for 6 more months/i)).toBeInTheDocument()
  })

  it('shows an achieved message instead of a suggestion once the goal is met', async () => {
    setup()
    vi.spyOn(goalsApi, 'listGoals').mockResolvedValue([
      { ...GOAL, achieved: true, percent_complete: '100.00' },
    ])

    renderWithClient(<GoalsPanel />)

    expect(await screen.findByText(/goal achieved/i)).toBeInTheDocument()
    expect(screen.queryByText(/suggested:/i)).not.toBeInTheDocument()
  })

  it('adds a new goal', async () => {
    setup()
    vi.spyOn(goalsApi, 'listGoals').mockResolvedValue([])
    vi.spyOn(goalsApi, 'createGoal').mockResolvedValue(GOAL)

    renderWithClient(<GoalsPanel />)
    await screen.findByText('Emergency Fund')

    fireEvent.change(screen.getByLabelText(/target amount/i), { target: { value: '1000.00' } })
    fireEvent.change(screen.getByLabelText(/target date/i), { target: { value: '2026-12-01' } })
    fireEvent.click(screen.getByRole('button', { name: /add goal/i }))

    await waitFor(() =>
      expect(goalsApi.createGoal).toHaveBeenCalledWith({
        envelopeId: 2,
        targetAmount: '1000.00',
        targetDate: '2026-12-01',
      }),
    )
    expect(await screen.findByText(/250\.00 of 1000\.00/)).toBeInTheDocument()
  })

  it('removes a goal', async () => {
    setup()
    vi.spyOn(goalsApi, 'listGoals').mockResolvedValue([GOAL])
    vi.spyOn(goalsApi, 'deleteGoal').mockResolvedValue(undefined)

    renderWithClient(<GoalsPanel />)
    await screen.findByText(/250\.00 of 1000\.00/)

    fireEvent.click(screen.getByRole('button', { name: /remove/i }))

    await waitFor(() => expect(goalsApi.deleteGoal).toHaveBeenCalledWith(1))
    expect(screen.queryByText(/250\.00 of 1000\.00/)).not.toBeInTheDocument()
  })
})
