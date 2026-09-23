import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-teal-600 text-white hover:bg-teal-700 disabled:bg-teal-300',
  secondary: 'border border-paper-300 text-paper-800 hover:bg-paper-50 disabled:opacity-50',
  ghost: 'text-paper-600 hover:bg-paper-100 disabled:opacity-50',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  )
}
