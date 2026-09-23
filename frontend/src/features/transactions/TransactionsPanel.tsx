import { useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/queryKeys'
import { listAccounts } from '../accounts/api'
import { listEnvelopes } from '../envelopes/api'
import { createTransaction, listTransactions, type Transaction } from './api'
import { Amount, Button, Card, Field, Input, Select } from '../../lib/ui'

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
    <Card title="Transactions">
      <div className="space-y-4">
        <ul className="divide-y divide-paper-100">
          {transactions.map((transaction) => (
            <li key={transaction.id} className="flex items-center justify-between py-2 text-sm">
              <span className="flex items-center gap-2">
                <span className="text-paper-400">{transaction.date}</span>
                <span className="text-paper-700">{transaction.payee}</span>
              </span>
              <span className="font-medium text-paper-900">
                <Amount value={transaction.amount} signed />
              </span>
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <Field label="Account" htmlFor={accountId2}>
            <Select id={accountId2} value={accountId} onChange={(e) => setAccountIdChoice(Number(e.target.value))}>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Date" htmlFor={dateId}>
            <Input id={dateId} type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>

          <Field label="Amount" htmlFor={amountId}>
            <Input
              id={amountId}
              required
              inputMode="decimal"
              placeholder="-25.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-28"
            />
          </Field>

          <Field label="Payee" htmlFor={payeeId}>
            <Input id={payeeId} required value={payee} onChange={(e) => setPayee(e.target.value)} />
          </Field>

          <Field label="Envelope" htmlFor={envelopeId2}>
            <Select
              id={envelopeId2}
              value={envelopeId}
              onChange={(e) => setEnvelopeId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Uncategorized</option>
              {envelopes.map((envelope) => (
                <option key={envelope.id} value={envelope.id}>
                  {envelope.name}
                </option>
              ))}
            </Select>
          </Field>

          <Button type="submit" disabled={createMutation.isPending}>
            Add transaction
          </Button>
        </form>
      </div>
    </Card>
  )
}
