import { useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invalidateMoneyMovement } from '../../lib/invalidateMoneyMovement'
import { queryKeys } from '../../lib/queryKeys'
import { listAccounts } from '../accounts/api'
import { listEnvelopes } from '../envelopes/api'
import {
  confirmRecurringBill,
  createRecurringBill,
  listDueBills,
  listRecurringBills,
  type BillFrequency,
  type RecurringBill,
} from './api'
import { Amount, Button, Card, Field, Input, Select } from '../../lib/ui'

const FREQUENCIES: BillFrequency[] = ['weekly', 'biweekly', 'monthly', 'yearly']

export function RecurringBillsPanel() {
  const nameId = useId()
  const accountFieldId = useId()
  const envelopeFieldId = useId()
  const amountId = useId()
  const frequencyId = useId()
  const dueDateId = useId()
  const queryClient = useQueryClient()

  const { data: accounts = [] } = useQuery({ queryKey: queryKeys.accounts, queryFn: listAccounts })
  const { data: envelopes = [] } = useQuery({ queryKey: queryKeys.envelopes, queryFn: listEnvelopes })
  const { data: bills = [] } = useQuery({
    queryKey: queryKeys.recurringBills,
    queryFn: listRecurringBills,
  })
  const { data: dueBills = [] } = useQuery({ queryKey: queryKeys.dueBills, queryFn: listDueBills })

  const [name, setName] = useState('')
  const [accountIdChoice, setAccountIdChoice] = useState<number | ''>('')
  const [envelopeIdChoice, setEnvelopeIdChoice] = useState<number | ''>('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<BillFrequency>('monthly')
  const [nextDueDate, setNextDueDate] = useState('')
  const [confirmingId, setConfirmingId] = useState<number | null>(null)

  const accountId: number | '' = accountIdChoice || (accounts[0]?.id ?? '')
  const envelopeId: number | '' = envelopeIdChoice || (envelopes[0]?.id ?? '')

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof createRecurringBill>[0]) => createRecurringBill(input),
    onSuccess: (bill) => {
      queryClient.setQueryData<RecurringBill[]>(queryKeys.recurringBills, (prev = []) =>
        [...prev, bill].sort((a, b) => a.next_due_date.localeCompare(b.next_due_date)),
      )
      if (bill.next_due_date <= new Date().toISOString().slice(0, 10)) {
        queryClient.setQueryData<RecurringBill[]>(queryKeys.dueBills, (prev = []) => [...prev, bill])
      }
    },
  })

  const confirmMutation = useMutation({
    mutationFn: (billId: number) => confirmRecurringBill(billId),
    onSuccess: (result, billId) => {
      queryClient.setQueryData<RecurringBill[]>(queryKeys.dueBills, (prev = []) =>
        prev.filter((bill) => bill.id !== billId),
      )
      queryClient.setQueryData<RecurringBill[]>(queryKeys.recurringBills, (prev = []) =>
        prev.map((bill) => (bill.id === billId ? result.bill : bill)),
      )
      // Confirming a bill creates a transaction and changes an account's balance.
      invalidateMoneyMovement(queryClient)
    },
  })

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (accountId === '' || envelopeId === '') return
    await createMutation.mutateAsync({
      name,
      accountId,
      envelopeId,
      amount,
      frequency,
      nextDueDate,
    })
    setName('')
    setAmount('')
    setNextDueDate('')
  }

  async function handleConfirm(billId: number) {
    setConfirmingId(billId)
    try {
      await confirmMutation.mutateAsync(billId)
    } finally {
      setConfirmingId(null)
    }
  }

  return (
    <Card title="Recurring bills" className="h-full">
      <div className="space-y-4">
        {dueBills.length > 0 && (
          <div className="space-y-2 rounded-md bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-800">Due now</p>
            <ul className="space-y-2">
              {dueBills.map((bill) => (
                <li key={bill.id} className="flex items-center justify-between text-sm">
                  <span className="text-amber-900">
                    {bill.name} — <Amount value={bill.amount} /> (due {bill.next_due_date})
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

        <ul className="divide-y divide-paper-100">
          {bills.map((bill) => (
            <li key={bill.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-paper-700">{bill.name}</span>
              <span className="text-paper-400">Next: {bill.next_due_date}</span>
              <span className="font-medium text-paper-900">
                <Amount value={bill.amount} signed />
              </span>
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <Field label="Name" htmlFor={nameId}>
            <Input id={nameId} required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>

          <Field label="Account" htmlFor={accountFieldId}>
            <Select
              id={accountFieldId}
              value={accountId}
              onChange={(e) => setAccountIdChoice(Number(e.target.value))}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Envelope" htmlFor={envelopeFieldId}>
            <Select
              id={envelopeFieldId}
              value={envelopeId}
              onChange={(e) => setEnvelopeIdChoice(Number(e.target.value))}
            >
              {envelopes.map((envelope) => (
                <option key={envelope.id} value={envelope.id}>
                  {envelope.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Amount" htmlFor={amountId}>
            <Input
              id={amountId}
              required
              inputMode="decimal"
              placeholder="-1200.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-28"
            />
          </Field>

          <Field label="Frequency" htmlFor={frequencyId}>
            <Select id={frequencyId} value={frequency} onChange={(e) => setFrequency(e.target.value as BillFrequency)}>
              {FREQUENCIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Next due date" htmlFor={dueDateId}>
            <Input
              id={dueDateId}
              type="date"
              required
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
            />
          </Field>

          <Button type="submit" disabled={createMutation.isPending}>
            Add bill
          </Button>
        </form>
      </div>
    </Card>
  )
}
