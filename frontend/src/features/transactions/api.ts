import { apiFetch } from '../../lib/http'

export interface Transaction {
  id: number
  account_id: number
  envelope_id: number | null
  date: string
  amount: string
  payee: string
  source: 'manual' | 'import'
}

export interface CreateTransactionInput {
  accountId: number
  date: string
  amount: string
  payee: string
  envelopeId?: number
}

export interface ListTransactionsFilter {
  accountId?: number
  envelopeId?: number
}

export async function listTransactions(filter: ListTransactionsFilter = {}): Promise<Transaction[]> {
  const params = new URLSearchParams()
  if (filter.accountId !== undefined) params.set('account_id', String(filter.accountId))
  if (filter.envelopeId !== undefined) params.set('envelope_id', String(filter.envelopeId))
  const query = params.toString()
  return apiFetch(`/api/transactions${query ? `?${query}` : ''}`)
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  return apiFetch('/api/transactions', {
    method: 'POST',
    body: {
      account_id: input.accountId,
      date: input.date,
      amount: input.amount,
      payee: input.payee,
      ...(input.envelopeId !== undefined ? { envelope_id: input.envelopeId } : {}),
    },
  })
}
