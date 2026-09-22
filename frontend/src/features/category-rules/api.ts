import { apiFetch } from '../../lib/http'

export interface CategoryRule {
  id: number
  envelope_id: number
  match_type: 'contains' | 'regex'
  pattern: string
  priority: number
}

export interface CreateCategoryRuleInput {
  envelopeId: number
  pattern: string
  priority?: number
}

export async function listCategoryRules(): Promise<CategoryRule[]> {
  return apiFetch('/api/category-rules')
}

export async function createCategoryRule(input: CreateCategoryRuleInput): Promise<CategoryRule> {
  return apiFetch('/api/category-rules', {
    method: 'POST',
    body: {
      envelope_id: input.envelopeId,
      pattern: input.pattern,
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
    },
  })
}
