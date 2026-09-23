import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

const CONTROL_CLASSES =
  'rounded-md border border-paper-300 bg-white px-2.5 py-1.5 text-sm text-paper-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100'

interface FieldProps {
  label: string
  htmlFor: string
  children: ReactNode
  className?: string
}

export function Field({ label, htmlFor, children, className = '' }: FieldProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-paper-600">
        {label}
      </label>
      {children}
    </div>
  )
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${CONTROL_CLASSES} ${className}`} {...props} />
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${CONTROL_CLASSES} ${className}`} {...props} />
}
