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
  scheduled: { bg: 'rgba(255,255,255,0.06)', fg: T.inkMuted },
  in_progress: { bg: 'rgba(245, 178, 76, 0.16)', fg: T.warning },
  successful: { bg: 'rgba(74, 199, 121, 0.16)', fg: T.success },
  failed: { bg: 'rgba(239, 92, 92, 0.16)', fg: T.danger },
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
