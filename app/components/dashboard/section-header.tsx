import { T } from '@/lib/theme'
import { ActionLink } from './action-link'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  subtitleColor?: string
  action?: string
  actionHref?: string
  onAction?: () => void
}

export function SectionHeader({
  title,
  subtitle,
  subtitleColor = T.brand,
  action,
  actionHref,
  onAction,
}: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 pl-5 pr-3">
      <div className="flex flex-col gap-1 min-w-0">
        <h2
          className="text-[18px] tracking-[-0.4px] pt-2"
          style={{ color: T.ink, fontWeight: 500 }}
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="text-[14px] leading-5" style={{ color: subtitleColor }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? (
        <ActionLink label={action} href={actionHref} onClick={onAction} />
      ) : null}
    </div>
  )
}
