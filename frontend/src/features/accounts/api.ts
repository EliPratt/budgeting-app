import { apiFetch } from '../../lib/http'

export type AccountType = 'checking' | 'savings' | 'credit_card'

export interface Account {
  id: number
  name: string
  type: AccountType
  starting_balance: string
  balance: string
}

export interface CreateAccountInput {
  name: string
  type: AccountType
  startingBalance: string
}

export async function listAccounts(): Promise<Account[]> {
  return apiFetch('/api/accounts')
}

export async function createAccount(input: CreateAccountInput): Promise<Account> {
  return apiFetch('/api/accounts', {
    method: 'POST',
    body: {
      name: input.name,
      type: input.type,
      starting_balance: input.startingBalance,
    },
  })
}

export async function deleteAccount(id: number): Promise<void> {
  await apiFetch(`/api/accounts/${id}`, { method: 'DELETE' })
}
