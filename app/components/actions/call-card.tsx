'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { T } from '@/lib/theme'
import { CallStatusBadge } from './call-status-badge'
import { SelectionCheckbox } from './selection-checkbox'
import type { Call } from './types'

export function CallCard({
  call,
  selectMode,
  selected,
  onToggleSelect,
}: {
  call: Call
  selectMode: boolean
  selected: boolean
  onToggleSelect: () => void
}) {
  const inner = (
    <div
      className="p-5 flex items-center gap-4 transition-colors"
      style={{
        background: T.card,
        border: `1px solid ${selected ? T.brand : T.border}`,
        borderRadius: 16,
      }}
    >
      {selectMode ? <SelectionCheckbox checked={selected} /> : null}
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
      {selectMode ? null : (
        <ChevronRight size={20} style={{ color: T.inkMuted }} strokeWidth={2} />
      )}
    </div>
  )

  if (selectMode) {
    return (
      <button
        type="button"
        onClick={onToggleSelect}
        className="text-left w-full"
        aria-pressed={selected}
      >
        {inner}
      </button>
    )
  }

  return (
    <Link href={`/actions/calls/${call.id}`} className="block">
      {inner}
    </Link>
  )
}
