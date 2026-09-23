export const queryKeys = {
  accounts: ['accounts'] as const,
  envelopes: ['envelopes'] as const,
  goals: ['goals'] as const,
  recurringBills: ['recurringBills'] as const,
  dueBills: ['dueBills'] as const,
  transactions: ['transactions'] as const,
  monthOverview: (year: number, month: number) => ['monthOverview', year, month] as const,
  reportsSpending: ['reports', 'spending'] as const,
  reportsTrend: ['reports', 'trend'] as const,
  reportsNetWorth: ['reports', 'netWorth'] as const,
}
