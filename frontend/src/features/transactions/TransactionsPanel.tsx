import { useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/queryKeys'
import { listAccounts } from '../accounts/api'
import { listEnvelopes } from '../envelopes/api'
import { createTransaction, listTransactions, type Transaction } from './api'

export function TransactionsPanel() {
  const dateId = useId()
  const amountId = useId()
  const payeeId = useId()
  const accountId2 = useId()
  const envelopeId2 = useId()
  const queryClient = useQueryClient()

  const { data: accounts = [] } = useQuery({ queryKey: queryKeys.accounts, queryFn: listAccounts })
  const { data: envelopes = [] } = useQuery({ queryKey: queryKeys.envelopes, queryFn: listEnvelopes })
  const { data: transactions = [] } = useQuery({
    queryKey: queryKeys.transactions,
    queryFn: () => listTransactions(),
  })

  const [accountIdChoice, setAccountIdChoice] = useState<number | ''>('')
  const [envelopeId, setEnvelopeId] = useState<number | ''>('')
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState('')
  const [payee, setPayee] = useState('')

  const accountId: number | '' = accountIdChoice || (accounts[0]?.id ?? '')

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof createTransaction>[0]) => createTransaction(input),
    onSuccess: (transaction) => {
      queryClient.setQueryData<Transaction[]>(queryKeys.transactions, (prev = []) => [
        transaction,
        ...prev,
      ])
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts })
      queryClient.invalidateQueries({ queryKey: ['monthOverview'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (accountId === '') return
    await createMutation.mutateAsync({
      accountId,
      date,
      amount,
      payee,
      ...(envelopeId !== '' ? { envelopeId } : {}),
    })
    setDate('')
    setAmount('')
    setPayee('')
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Transactions</h2>

      <ul className="divide-y divide-slate-100">
        {transactions.map((transaction) => (
          <li key={transaction.id} className="flex items-center justify-between py-2 text-sm">
            <span className="flex items-center gap-2">
              <span className="text-slate-400">{transaction.date}</span>
              <span className="text-slate-700">{transaction.payee}</span>
            </span>
            <span className="font-medium text-slate-900">{transaction.amount}</span>
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor={accountId2} className="block text-xs font-medium text-slate-500">
            Account
          </label>
          <select
            id={accountId2}
            value={accountId}
            onChange={(e) => setAccountIdChoice(Number(e.target.value))}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor={dateId} className="block text-xs font-medium text-slate-500">
            Date
          </label>
          <input
            id={dateId}
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor={amountId} className="block text-xs font-medium text-slate-500">
            Amount
          </label>
          <input
            id={amountId}
            required
            inputMode="decimal"
            placeholder="-25.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor={payeeId} className="block text-xs font-medium text-slate-500">
            Payee
          </label>
          <input
            id={payeeId}
            required
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor={envelopeId2} className="block text-xs font-medium text-slate-500">
            Envelope
          </label>
          <select
            id={envelopeId2}
            value={envelopeId}
            onChange={(e) => setEnvelopeId(e.target.value ? Number(e.target.value) : '')}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="">Uncategorized</option>
            {envelopes.map((envelope) => (
              <option key={envelope.id} value={envelope.id}>
                {envelope.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          Add transaction
        </button>
      </form>
    </section>
  )
}
