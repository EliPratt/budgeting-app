import { useId, useState } from 'react'
import { Button, Field, Input } from '../../lib/ui'

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const emailId = useId()
  const passwordId = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5 rounded-lg bg-white p-8 shadow-lg">
      <div>
        <h1 className="font-display text-xl font-semibold text-paper-900">Budget</h1>
        <p className="mt-1 text-sm text-paper-500">Log in to pick up where you left off.</p>
      </div>

      <Field label="Email" htmlFor={emailId}>
        <Input
          id={emailId}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full"
        />
      </Field>

      <Field label="Password" htmlFor={passwordId}>
        <Input
          id={passwordId}
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full"
        />
      </Field>

      {error && (
        <p role="alert" className="text-sm text-[var(--color-money-negative)]">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Logging in…' : 'Log in'}
      </Button>
    </form>
  )
}
