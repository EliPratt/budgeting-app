import { useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/queryKeys'
import { createEnvelope, listEnvelopes, type Envelope } from './api'
import { Button, Card, Field, Input } from '../../lib/ui'

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
    <Card title="Envelopes" className="h-full">
      <div className="space-y-4">
        <ul className="divide-y divide-paper-100">
          {envelopes.map((envelope) => (
            <li key={envelope.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-paper-700">{envelope.name}</span>
              {envelope.group_name && <span className="text-xs text-paper-400">{envelope.group_name}</span>}
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <Field label="Name" htmlFor={nameId}>
            <Input id={nameId} required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>

          <Field label="Group (optional)" htmlFor={groupId}>
            <Input id={groupId} value={groupName} onChange={(e) => setGroupName(e.target.value)} />
          </Field>

          <Button type="submit" disabled={createMutation.isPending}>
            Add envelope
          </Button>
        </form>
      </div>
    </Card>
  )
}
