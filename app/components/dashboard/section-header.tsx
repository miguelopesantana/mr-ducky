import { T } from '@/lib/theme'
import { ActionLink } from './action-link'

interface SectionHeaderProps {
  title: string
  action?: string
  actionHref?: string
  onAction?: () => void
}

export function SectionHeader({
  title,
  action,
  actionHref,
  onAction,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between pl-5 pr-3">
      <h2
        className="text-[18px] tracking-[-0.4px]"
        style={{ color: T.ink, fontWeight: 500 }}
      >
        {title}
      </h2>
      {action ? (
        <ActionLink label={action} href={actionHref} onClick={onAction} />
      ) : null}
    </div>
  )
}
