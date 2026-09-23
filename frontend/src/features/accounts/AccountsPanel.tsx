import { useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/queryKeys'
import { createAccount, listAccounts, type Account, type AccountType } from './api'

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
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Accounts</h2>

      <ul className="divide-y divide-slate-100">
        {accounts.map((account) => (
          <li key={account.id} className="flex items-center justify-between py-2 text-sm">
            <span className="text-slate-700">{account.name}</span>
            <span className="font-medium text-slate-900">${account.balance}</span>
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor={nameId} className="block text-xs font-medium text-slate-500">
            Name
          </label>
          <input
            id={nameId}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor={typeId} className="block text-xs font-medium text-slate-500">
            Type
          </label>
          <select
            id={typeId}
            value={type}
            onChange={(e) => setType(e.target.value as AccountType)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          >
            {ACCOUNT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor={balanceId} className="block text-xs font-medium text-slate-500">
            Starting balance
          </label>
          <input
            id={balanceId}
            required
            inputMode="decimal"
            value={startingBalance}
            onChange={(e) => setStartingBalance(e.target.value)}
            className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          Add account
        </button>
      </form>
    </section>
  )
}
