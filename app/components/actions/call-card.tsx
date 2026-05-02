import Link from 'next/link'
import { T } from '@/lib/theme'
import { CallStatusBadge } from './call-status-badge'
import type { Call } from './types'

export function CallCard({ call, disableLink }: { call: Call; disableLink?: boolean }) {
  const inner = (
    <div
      className="p-5 flex flex-col gap-1.5"
      style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16 }}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className="text-[18px] tracking-[-0.4px] flex-1 min-w-0"
          style={{ color: T.ink, fontWeight: 500 }}
        >
          {call.title}
        </p>
        <CallStatusBadge status={call.status} />
      </div>
      <p className="text-[14px] leading-5" style={{ color: T.inkMuted }}>
        {call.description}
      </p>
    </div>
  )

  if (disableLink) return inner

  return (
    <Link href={`/actions/calls/${call.id}`} className="block">
      {inner}
    </Link>
  )
}
