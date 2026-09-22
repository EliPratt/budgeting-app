import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  it('calls onSubmit with the entered email and password', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<LoginForm onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'owner@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'hunter2' } })
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('owner@example.com', 'hunter2')
    })
  })

  it('shows an error message when onSubmit rejects', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Incorrect email or password'))
    render(<LoginForm onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'owner@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByText('Incorrect email or password')).toBeInTheDocument()
  })

  it('does not show an error before any submission', () => {
    render(<LoginForm onSubmit={vi.fn()} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
