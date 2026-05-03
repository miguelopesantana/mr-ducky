import { CheckCircle2, Clock, Loader2, XCircle, type LucideIcon } from 'lucide-react'
import { T } from '@/lib/theme'
import type { CallStatus } from './types'

const LABELS: Record<CallStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  successful: 'Successful',
  failed: 'Failed',
}

const ICONS: Record<CallStatus, LucideIcon> = {
  scheduled: Clock,
  in_progress: Loader2,
  successful: CheckCircle2,
  failed: XCircle,
}

const COLORS: Record<CallStatus, { bg: string; fg: string }> = {
  scheduled: { bg: T.inkSoft, fg: T.inkMuted },
  in_progress: { bg: T.warningBg, fg: T.warning },
  successful: { bg: T.successBg, fg: T.success },
  failed: { bg: T.dangerBg, fg: T.danger },
}

export function CallStatusBadge({ status }: { status: CallStatus }) {
  const { bg, fg } = COLORS[status]
  const Icon = ICONS[status]
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] tracking-[-0.2px]"
      style={{ background: bg, color: fg, fontWeight: 500 }}
    >
      <Icon size={12} strokeWidth={2.5} />
      {LABELS[status]}
    </span>
  )
}
