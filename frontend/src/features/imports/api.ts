import { apiFetch } from '../../lib/http'
import type { Transaction } from '../transactions/api'

export interface ImportBatch {
  id: number
  account_id: number
  filename: string
  imported_count: number
  duplicate_count: number
}

export interface ImportResult {
  batch: ImportBatch
  created: Transaction[]
}

export async function uploadImport(accountId: number, file: File): Promise<ImportResult> {
  const formData = new FormData()
  formData.set('account_id', String(accountId))
  formData.set('file', file)
  return apiFetch('/api/imports', { method: 'POST', body: formData })
}
