import { useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/queryKeys'
import { createAccount, listAccounts, type Account, type AccountType } from './api'
import { Amount, Button, Card, Field, Input, Select } from '../../lib/ui'

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit_card', label: 'Credit card' },
]

export function AccountsPanel() {
  const nameId = useId()
  const typeId = useId()
  const balanceId = useId()
  const queryClient = useQueryClient()

  const { data: accounts = [] } = useQuery({ queryKey: queryKeys.accounts, queryFn: listAccounts })

  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('checking')
  const [startingBalance, setStartingBalance] = useState('')

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof createAccount>[0]) => createAccount(input),
    onSuccess: (account) => {
      queryClient.setQueryData<Account[]>(queryKeys.accounts, (prev = []) => [...prev, account])
      // A new account's starting balance changes net worth.
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    await createMutation.mutateAsync({ name, type, startingBalance })
    setName('')
    setStartingBalance('')
  }

  return (
    <Card title="Accounts" className="h-full">
      <div className="space-y-4">
        <ul className="divide-y divide-paper-100">
          {accounts.map((account) => (
            <li key={account.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-paper-700">{account.name}</span>
              <span className="font-medium text-paper-900">
                <Amount value={account.balance} signed />
              </span>
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <Field label="Name" htmlFor={nameId}>
            <Input id={nameId} required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>

          <Field label="Type" htmlFor={typeId}>
            <Select id={typeId} value={type} onChange={(e) => setType(e.target.value as AccountType)}>
              {ACCOUNT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Starting balance" htmlFor={balanceId}>
            <Input
              id={balanceId}
              required
              inputMode="decimal"
              value={startingBalance}
              onChange={(e) => setStartingBalance(e.target.value)}
              className="w-28"
            />
          </Field>

          <Button type="submit" disabled={createMutation.isPending}>
            Add account
          </Button>
        </form>
      </div>
    </Card>
  )
}
