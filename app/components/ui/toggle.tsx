'use client'

import { T } from '@/lib/theme'

interface ToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative shrink-0 transition-colors"
      style={{
        width: 52,
        height: 30,
        borderRadius: 999,
        background: checked ? T.brand : T.border,
      }}
    >
      <span
        className="absolute top-1/2 -translate-y-1/2 transition-all"
        style={{
          left: checked ? 24 : 2,
          width: 26,
          height: 26,
          borderRadius: 999,
          background: T.page,
        }}
      />
    </button>
  )
}
