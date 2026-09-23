import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithClient } from '../../test/render'
import * as api from './api'
import { EnvelopesPanel } from './EnvelopesPanel'

describe('EnvelopesPanel', () => {
  afterEach(() => vi.restoreAllMocks())

  it('lists envelopes fetched on mount', async () => {
    vi.spyOn(api, 'listEnvelopes').mockResolvedValue([
      { id: 1, name: 'Groceries', group_name: 'Everyday' },
    ])

    renderWithClient(<EnvelopesPanel />)

    expect(await screen.findByText('Groceries')).toBeInTheDocument()
  })

  it('adds a new envelope to the list after submitting the form', async () => {
    vi.spyOn(api, 'listEnvelopes').mockResolvedValue([])
    vi.spyOn(api, 'createEnvelope').mockResolvedValue({ id: 2, name: 'Rent', group_name: null })

    renderWithClient(<EnvelopesPanel />)
    await waitFor(() => expect(api.listEnvelopes).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Rent' } })
    fireEvent.click(screen.getByRole('button', { name: /add envelope/i }))

    expect(await screen.findByText('Rent')).toBeInTheDocument()
    expect(api.createEnvelope).toHaveBeenCalledWith({ name: 'Rent', groupName: '' })
  })
})
