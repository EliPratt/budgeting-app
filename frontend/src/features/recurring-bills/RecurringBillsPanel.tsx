import { useEffect, useId, useState } from 'react'
import { listAccounts, type Account } from '../accounts/api'
import { listEnvelopes, type Envelope } from '../envelopes/api'
import {
  confirmRecurringBill,
  createRecurringBill,
  listDueBills,
  listRecurringBills,
  type BillFrequency,
  type RecurringBill,
} from './api'

const FREQUENCIES: BillFrequency[] = ['weekly', 'biweekly', 'monthly', 'yearly']

export function RecurringBillsPanel() {
  const nameId = useId()
  const accountFieldId = useId()
  const envelopeFieldId = useId()
  const amountId = useId()
  const frequencyId = useId()
  const dueDateId = useId()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [envelopes, setEnvelopes] = useState<Envelope[]>([])
  const [bills, setBills] = useState<RecurringBill[]>([])
  const [dueBills, setDueBills] = useState<RecurringBill[]>([])

  const [name, setName] = useState('')
  const [accountId, setAccountId] = useState<number | ''>('')
  const [envelopeId, setEnvelopeId] = useState<number | ''>('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<BillFrequency>('monthly')
  const [nextDueDate, setNextDueDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)

  useEffect(() => {
    listAccounts().then((loaded) => {
      setAccounts(loaded)
      setAccountId((current) => current || (loaded[0]?.id ?? ''))
    })
    listEnvelopes().then((loaded) => {
      setEnvelopes(loaded)
      setEnvelopeId((current) => current || (loaded[0]?.id ?? ''))
    })
    listRecurringBills().then(setBills)
    listDueBills().then(setDueBills)
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (accountId === '' || envelopeId === '') return
    setSubmitting(true)
    try {
      const bill = await createRecurringBill({
        name,
        accountId,
        envelopeId,
        amount,
        frequency,
        nextDueDate,
      })
      setBills((prev) => [...prev, bill].sort((a, b) => a.next_due_date.localeCompare(b.next_due_date)))
      if (bill.next_due_date <= new Date().toISOString().slice(0, 10)) {
        setDueBills((prev) => [...prev, bill])
      }
      setName('')
      setAmount('')
      setNextDueDate('')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirm(billId: number) {
    setConfirmingId(billId)
    try {
      const result = await confirmRecurringBill(billId)
      setDueBills((prev) => prev.filter((bill) => bill.id !== billId))
      setBills((prev) => prev.map((bill) => (bill.id === billId ? result.bill : bill)))
    } finally {
      setConfirmingId(null)
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Recurring bills</h2>

      {dueBills.length > 0 && (
        <div className="space-y-2 rounded-md bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-800">Due now</p>
          <ul className="space-y-2">
            {dueBills.map((bill) => (
              <li key={bill.id} className="flex items-center justify-between text-sm">
                <span className="text-amber-900">
                  {bill.name} — {bill.amount} (due {bill.next_due_date})
                </span>
                <button
                  type="button"
                  onClick={() => handleConfirm(bill.id)}
                  disabled={confirmingId === bill.id}
                  className="rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  Confirm
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="divide-y divide-slate-100">
        {bills.map((bill) => (
          <li key={bill.id} className="flex items-center justify-between py-2 text-sm">
            <span className="text-slate-700">{bill.name}</span>
            <span className="text-slate-400">Next: {bill.next_due_date}</span>
            <span className="font-medium text-slate-900">{bill.amount}</span>
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
          <label htmlFor={accountFieldId} className="block text-xs font-medium text-slate-500">
            Account
          </label>
          <select
            id={accountFieldId}
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
          <label htmlFor={envelopeFieldId} className="block text-xs font-medium text-slate-500">
            Envelope
          </label>
          <select
            id={envelopeFieldId}
            value={envelopeId}
            onChange={(e) => setEnvelopeId(Number(e.target.value))}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          >
            {envelopes.map((envelope) => (
              <option key={envelope.id} value={envelope.id}>
                {envelope.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor={amountId} className="block text-xs font-medium text-slate-500">
            Amount
          </label>
          <input
            id={amountId}
            required
            inputMode="decimal"
            placeholder="-1200.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor={frequencyId} className="block text-xs font-medium text-slate-500">
            Frequency
          </label>
          <select
            id={frequencyId}
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as BillFrequency)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          >
            {FREQUENCIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor={dueDateId} className="block text-xs font-medium text-slate-500">
            Next due date
          </label>
          <input
            id={dueDateId}
            type="date"
            required
            value={nextDueDate}
            onChange={(e) => setNextDueDate(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          Add bill
        </button>
      </form>
    </section>
  )
}
