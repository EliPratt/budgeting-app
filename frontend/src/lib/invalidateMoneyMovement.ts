import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'

/**
 * Anything that creates or moves a transaction (a manual entry, an import,
 * confirming a recurring bill) changes account balances, the current
 * month's envelope activity, and every report chart — all queried
 * independently of the panel that triggered the change. Centralized here
 * so each mutation site doesn't have to re-enumerate the same four keys.
 */
export function invalidateMoneyMovement(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.accounts })
  queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
  queryClient.invalidateQueries({ queryKey: ['monthOverview'] })
  queryClient.invalidateQueries({ queryKey: ['reports'] })
}
