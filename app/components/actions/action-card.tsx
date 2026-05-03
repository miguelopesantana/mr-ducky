import { T } from '@/lib/theme'

interface Props {
  title: string
  description: string
  headerAction: React.ReactNode
  onViewDetails?: () => void
}

export function ActionCard({ title, description, headerAction, onViewDetails }: Props) {
  return (
    <div
      className="flex flex-col"
      style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16 }}
    >
      <div className="p-5 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <p
            className="text-[18px] tracking-[-0.4px] flex-1 min-w-0"
            style={{ color: T.ink, fontWeight: 500 }}
          >
            {title}
          </p>
          {headerAction}
        </div>
        <p className="text-[14px] leading-5" style={{ color: T.inkMuted }}>
          {description}
        </p>
      </div>
      {onViewDetails && (
        <button
          type="button"
          onClick={onViewDetails}
          className="w-full py-3.5 text-[14px] border-t"
          style={{ color: T.ink, borderColor: T.border, fontWeight: 500 }}
        >
          View Details
        </button>
      )}
    </div>
  )
}
