import type { ReactNode } from 'react'

interface CardProps {
  title: string
  eyebrow?: ReactNode
  action?: ReactNode
  emphasis?: boolean
  children: ReactNode
  className?: string
}

/**
 * Emphasis cards (the "job to be done" panel, e.g. the current month) get the
 * teal accent bar; everything else is a quiet hairline-bordered surface. One
 * card style for every panel was the thing we were trying to get away from.
 */
export function Card({ title, eyebrow, action, emphasis = false, children, className = '' }: CardProps) {
  return (
    <section
      className={`rounded-lg bg-white ${
        emphasis ? 'border border-teal-200 shadow-[inset_4px_0_0_var(--color-teal-500)]' : 'border border-paper-200'
      } p-6 ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          {eyebrow}
          <h2 className="font-display text-xl font-semibold text-paper-900">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
