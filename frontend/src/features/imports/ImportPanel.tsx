import { useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invalidateMoneyMovement } from '../../lib/invalidateMoneyMovement'
import { queryKeys } from '../../lib/queryKeys'
import { createCategoryRule } from '../category-rules/api'
import { listAccounts } from '../accounts/api'
import { listEnvelopes } from '../envelopes/api'
import { updateTransaction, type Transaction } from '../transactions/api'
import { uploadImport, type ImportBatch } from './api'

interface ReviewRow {
  transaction: Transaction
  envelopeId: number | ''
  saveAsRule: boolean
}

export function ImportPanel() {
  const accountSelectId = useId()
  const fileInputId = useId()
  const queryClient = useQueryClient()

  const { data: accounts = [] } = useQuery({ queryKey: queryKeys.accounts, queryFn: listAccounts })
  const { data: envelopes = [] } = useQuery({ queryKey: queryKeys.envelopes, queryFn: listEnvelopes })

  const [accountIdChoice, setAccountIdChoice] = useState<number | ''>('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [batch, setBatch] = useState<ImportBatch | null>(null)
  const [rows, setRows] = useState<ReviewRow[]>([])

  const accountId: number | '' = accountIdChoice || (accounts[0]?.id ?? '')

  const uploadMutation = useMutation({
    mutationFn: ({ accountId, file }: { accountId: number; file: File }) => uploadImport(accountId, file),
    onSuccess: (result) => {
      setBatch(result.batch)
      setRows(
        result.created.map((transaction) => ({
          transaction,
          envelopeId: transaction.envelope_id ?? '',
          saveAsRule: false,
        })),
      )
      invalidateMoneyMovement(queryClient)
    },
  })

  const assignMutation = useMutation({
    mutationFn: ({ transactionId, envelopeId }: { transactionId: number; envelopeId: number }) =>
      updateTransaction(transactionId, { envelopeId }),
    onSuccess: (updated) => {
      setRows((prev) =>
        prev.map((r) => (r.transaction.id === updated.id ? { ...r, transaction: updated } : r)),
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
      queryClient.invalidateQueries({ queryKey: ['monthOverview'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault()
    if (accountId === '' || file === null) return
    setError(null)
    try {
      await uploadMutation.mutateAsync({ accountId, file })
      setFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.')
    }
  }

  async function handleAssign(index: number) {
    const row = rows[index]
    if (row.envelopeId === '') return

    await assignMutation.mutateAsync({ transactionId: row.transaction.id, envelopeId: row.envelopeId })
    if (row.saveAsRule) {
      await createCategoryRule({ envelopeId: row.envelopeId, pattern: row.transaction.payee })
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Import transactions</h2>

      <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor={accountSelectId} className="block text-xs font-medium text-slate-500">
            Account
          </label>
          <select
            id={accountSelectId}
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
          <label htmlFor={fileInputId} className="block text-xs font-medium text-slate-500">
            CSV or OFX file
          </label>
          <input
            id={fileInputId}
            type="file"
            accept=".csv,.ofx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={uploadMutation.isPending || file === null}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          Upload
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {batch && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Imported {batch.imported_count} transaction{batch.imported_count === 1 ? '' : 's'}
          {batch.duplicate_count > 0 &&
            ` (skipped ${batch.duplicate_count} duplicate${batch.duplicate_count === 1 ? '' : 's'})`}
          .
        </div>
      )}

      {rows.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Payee</th>
              <th className="pb-2 font-medium">Amount</th>
              <th className="pb-2 font-medium">Envelope</th>
              <th className="pb-2 font-medium">Save rule</th>
              <th className="pb-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={row.transaction.id}>
                <td className="py-2 text-slate-400">{row.transaction.date}</td>
                <td className="py-2 text-slate-700">{row.transaction.payee}</td>
                <td className="py-2 font-medium text-slate-900">{row.transaction.amount}</td>
                <td className="py-2">
                  <label className="sr-only" htmlFor={`envelope-${row.transaction.id}`}>
                    Envelope for {row.transaction.payee}
                  </label>
                  <select
                    id={`envelope-${row.transaction.id}`}
                    value={row.envelopeId}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r, i) =>
                          i === index
                            ? { ...r, envelopeId: e.target.value ? Number(e.target.value) : '' }
                            : r,
                        ),
                      )
                    }
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                  >
                    <option value="">Uncategorized</option>
                    {envelopes.map((envelope) => (
                      <option key={envelope.id} value={envelope.id}>
                        {envelope.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2">
                  <input
                    type="checkbox"
                    aria-label={`Save a rule for ${row.transaction.payee}`}
                    checked={row.saveAsRule}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r, i) => (i === index ? { ...r, saveAsRule: e.target.checked } : r)),
                      )
                    }
                  />
                </td>
                <td className="py-2">
                  <button
                    type="button"
                    onClick={() => handleAssign(index)}
                    disabled={row.envelopeId === ''}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
                  >
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
