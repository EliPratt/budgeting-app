import { apiFetch } from '../../lib/http'
import type { Transaction } from '../transactions/api'

export type BillFrequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly'

export interface RecurringBill {
  id: number
  name: string
  account_id: number
  envelope_id: number
  amount: string
  frequency: BillFrequency
  next_due_date: string
}

export interface CreateRecurringBillInput {
  name: string
  accountId: number
  envelopeId: number
  amount: string
  frequency: BillFrequency
  nextDueDate: string
}

export interface ConfirmBillResult {
  bill: RecurringBill
  transaction: Transaction
}

export async function listRecurringBills(): Promise<RecurringBill[]> {
  return apiFetch('/api/recurring-bills')
}

export async function listDueBills(): Promise<RecurringBill[]> {
  return apiFetch('/api/recurring-bills/due')
}

export async function createRecurringBill(input: CreateRecurringBillInput): Promise<RecurringBill> {
  return apiFetch('/api/recurring-bills', {
    method: 'POST',
    body: {
      name: input.name,
      account_id: input.accountId,
      envelope_id: input.envelopeId,
      amount: input.amount,
      frequency: input.frequency,
      next_due_date: input.nextDueDate,
    },
  })
}

export async function confirmRecurringBill(billId: number): Promise<ConfirmBillResult> {
  return apiFetch(`/api/recurring-bills/${billId}/confirm`, { method: 'POST' })
}

export async function deleteRecurringBill(billId: number): Promise<void> {
  await apiFetch(`/api/recurring-bills/${billId}`, { method: 'DELETE' })
}
