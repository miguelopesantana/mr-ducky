'use client'

import { X } from 'lucide-react'
import { T } from '@/lib/theme'
import type { Call } from './types'
import { BottomSheet } from '@/components/transactions/bottom-sheet'
import { CallStatusBadge } from './call-status-badge'

const STATUS_MESSAGE: Partial<Record<string, string>> = {
  scheduled: 'This call is scheduled and will begin soon.',
  in_progress: "Your request has been sent. We'll notify you as soon as there's an update.",
}

interface Props {
  call: Call | null
  onClose: () => void
}

export function CallDetailSheet({ call, onClose }: Props) {
  return (
    <BottomSheet open={call !== null} onClose={onClose} ariaLabel="Call details">
      {call && (
        <>
          <div className="mb-5 flex items-start justify-between gap-3">
            <h3
              className="text-[20px] tracking-[-0.4px] leading-tight"
              style={{ color: T.ink, fontWeight: 500 }}
            >
              {call.title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="size-8 inline-flex items-center justify-center shrink-0"
              style={{ color: T.ink }}
            >
              <X size={24} />
            </button>
          </div>

          <div className="mb-2 border-b" style={{ borderColor: T.border }}>
            <div className="mb-4 py-3 flex items-center justify-between gap-3 border-b"  style={{ borderColor: T.border }}>
              <p className="text-[16px]" style={{ color: T.inkMuted }}>Type</p>
              <span
                className="text-[13px] px-3 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.08)', color: T.ink, fontWeight: 500 }}
              >
                Calls
              </span>
            </div>
            <div className="py-3 flex items-center justify-between gap-3">
              <p className="text-[16px]" style={{ color: T.inkMuted }}>State</p>
              <CallStatusBadge status={call.status} />
            </div>
            {(call.resultSummary ?? STATUS_MESSAGE[call.status]) && (
              <p className="pt-1 pb-1 text-[15px] leading-[1.5]" style={{ color: T.inkMuted }}>
                {call.resultSummary ?? STATUS_MESSAGE[call.status]}
              </p>
            )}
          </div>

          <div className="pt-4">
            <p
              className="text-[13px] uppercase tracking-[0.6px] mb-3"
              style={{ color: T.inkFaint, fontWeight: 600 }}
            >
              Description
            </p>
            <p className="text-[15px] leading-[1.5]" style={{ color: T.ink }}>
              {call.description}
            </p>
          </div>
        </>
      )}
    </BottomSheet>
  )
}
