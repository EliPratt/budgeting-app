const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function formatAmount(value: number | string): string {
  return formatter.format(typeof value === 'string' ? Number(value) : value)
}

interface AmountProps {
  value: number | string
  /** Color the figure by sign. Off by default — most figures (assigned, balances) are neutral. */
  signed?: boolean
  className?: string
}

/**
 * Every dollar figure in the app should render through here: consistent
 * $X,XXX.XX formatting, tabular figures so columns line up, and — only when
 * asked for — the sign color applied to the number itself rather than the row.
 */
export function Amount({ value, signed = false, className = '' }: AmountProps) {
  const numeric = typeof value === 'string' ? Number(value) : value
  const toneClass = signed ? (numeric < 0 ? 'text-[var(--color-money-negative)]' : 'text-[var(--color-money-positive)]') : ''

  return <span className={`tabular-nums ${toneClass} ${className}`}>{formatter.format(numeric)}</span>
}
