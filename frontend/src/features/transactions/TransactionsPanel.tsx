import { useEffect, useId, useState } from 'react'
import { listAccounts, type Account } from '../accounts/api'
import { listEnvelopes, type Envelope } from '../envelopes/api'
import { createTransaction, listTransactions, type Transaction } from './api'

export function TransactionsPanel() {
  const dateId = useId()
  const amountId = useId()
  const payeeId = useId()
  const accountId2 = useId()
  const envelopeId2 = useId()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [envelopes, setEnvelopes] = useState<Envelope[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const [accountId, setAccountId] = useState<number | ''>('')
  const [envelopeId, setEnvelopeId] = useState<number | ''>('')
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState('')
  const [payee, setPayee] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    listAccounts().then((loaded) => {
      setAccounts(loaded)
      setAccountId((current) => current || (loaded[0]?.id ?? ''))
    })
    listEnvelopes().then(setEnvelopes)
    listTransactions().then(setTransactions)
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (accountId === '') return
    setSubmitting(true)
    try {
      const transaction = await createTransaction({
        accountId,
        date,
        amount,
        payee,
        ...(envelopeId !== '' ? { envelopeId } : {}),
      })
      setTransactions((prev) => [transaction, ...prev])
      setDate('')
      setAmount('')
      setPayee('')
    } finally {
      setSubmitting(false)
    }
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
            onChange={(e) => setAccountId(Number(e.target.value))}
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
          disabled={submitting}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          Add transaction
        </button>
      </form>
    </section>
  )
}
