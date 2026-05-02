import { Check } from 'lucide-react'
import { T } from '@/lib/theme'

export function SelectionCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      className="size-6 rounded-md flex items-center justify-center shrink-0 transition-colors"
      style={{
        background: checked ? T.brand : 'transparent',
        border: `1.5px solid ${checked ? T.brand : T.border}`,
        color: '#1A1A1A',
      }}
      aria-hidden
    >
      {checked ? <Check size={14} strokeWidth={3} /> : null}
    </span>
  )
}
