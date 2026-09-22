import { apiFetch } from '../../lib/http'

export interface Envelope {
  id: number
  name: string
  group_name: string | null
}

export interface CreateEnvelopeInput {
  name: string
  groupName?: string
}

export async function listEnvelopes(): Promise<Envelope[]> {
  return apiFetch('/api/envelopes')
}

export async function createEnvelope(input: CreateEnvelopeInput): Promise<Envelope> {
  return apiFetch('/api/envelopes', {
    method: 'POST',
    body: input.groupName ? { name: input.name, group_name: input.groupName } : { name: input.name },
  })
}
