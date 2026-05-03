import { T } from '@/lib/theme'

interface ChipProps {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}

export function Chip({ children, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border px-4 h-11 text-[14px] inline-flex items-center gap-1.5"
      style={{
        borderColor: active ? T.brand : T.border,
        background: active ? T.brand : 'transparent',
        color: active ? T.inkOnBrand : T.ink,
        fontWeight: active ? 600 : 500,
      }}
    >
      {children}
    </button>
  )
}
