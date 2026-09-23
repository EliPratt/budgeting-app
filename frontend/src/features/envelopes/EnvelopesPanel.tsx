import { useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/queryKeys'
import { createEnvelope, listEnvelopes, type Envelope } from './api'

export function EnvelopesPanel() {
  const nameId = useId()
  const groupId = useId()
  const queryClient = useQueryClient()

  const { data: envelopes = [] } = useQuery({ queryKey: queryKeys.envelopes, queryFn: listEnvelopes })

  const [name, setName] = useState('')
  const [groupName, setGroupName] = useState('')

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof createEnvelope>[0]) => createEnvelope(input),
    onSuccess: (envelope) => {
      queryClient.setQueryData<Envelope[]>(queryKeys.envelopes, (prev = []) => [...prev, envelope])
      // The current month's Budget table has a row per envelope.
      queryClient.invalidateQueries({ queryKey: ['monthOverview'] })
    },
  })

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    await createMutation.mutateAsync({ name, groupName })
    setName('')
    setGroupName('')
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Envelopes</h2>

      <ul className="divide-y divide-slate-100">
        {envelopes.map((envelope) => (
          <li key={envelope.id} className="flex items-center justify-between py-2 text-sm">
            <span className="text-slate-700">{envelope.name}</span>
            {envelope.group_name && (
              <span className="text-xs text-slate-400">{envelope.group_name}</span>
            )}
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
          <label htmlFor={groupId} className="block text-xs font-medium text-slate-500">
            Group (optional)
          </label>
          <input
            id={groupId}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          Add envelope
        </button>
      </form>
    </section>
  )
}
