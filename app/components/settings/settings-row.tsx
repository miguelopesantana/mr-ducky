import { ChevronRight, type LucideIcon } from 'lucide-react'
import { T } from '@/lib/theme'

interface SettingsRowProps {
  label: string
  icon?: LucideIcon
  tone?: 'default' | 'danger'
  showChevron?: boolean
  disabled?: boolean
  onClick?: () => void
}

export function SettingsRow({
  label,
  icon: IconComp,
  tone = 'default',
  showChevron = true,
  disabled,
  onClick,
}: SettingsRowProps) {
  const color = tone === 'danger' ? T.danger : T.ink
  const fontWeight = tone === 'danger' ? 500 : 400
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-between px-4 transition-opacity hover:opacity-80 disabled:opacity-60"
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        height: 52,
      }}
    >
      <span className="flex items-center gap-3">
        {IconComp ? <IconComp size={18} strokeWidth={2} color={color} /> : null}
        <span
          className="text-[16px]"
          style={{ color, fontFamily: T.text, fontWeight }}
        >
          {label}
        </span>
      </span>
      {showChevron ? <ChevronRight size={18} strokeWidth={2} color={T.ink} /> : null}
    </button>
  )
}
