import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { T } from '@/lib/theme'
import { CallStatusBadge } from './call-status-badge'
import type { Call } from './types'

export function CallCard({ call, disableLink }: { call: Call; disableLink?: boolean }) {
  const inner = (
    <div
      className="p-5 flex items-center gap-4"
      style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16 }}
    >
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <CallStatusBadge status={call.status} />
        <p
          className="text-[18px] tracking-[-0.4px]"
          style={{ color: T.ink, fontWeight: 500 }}
        >
          {call.title}
        </p>
        <p className="text-[14px] leading-5" style={{ color: T.inkMuted }}>
          {call.description}
        </p>
      </div>
      {!disableLink ? (
        <ChevronRight size={20} style={{ color: T.inkMuted }} strokeWidth={2} />
      ) : null}
    </div>
  )

  if (disableLink) return inner

  return (
    <Link href={`/actions/calls/${call.id}`} className="block">
      {inner}
    </Link>
  )
}
