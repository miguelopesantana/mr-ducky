'use client'

import { X } from 'lucide-react'
import { T } from '@/lib/theme'
import type { Routine } from './types'
import { BottomSheet } from '@/components/transactions/bottom-sheet'

interface Props {
  routine: Routine | null
  onClose: () => void
}

export function RoutineDetailSheet({ routine, onClose }: Props) {
  return (
    <BottomSheet open={routine !== null} onClose={onClose} ariaLabel="Routine details">
      {routine && (
        <>
          <div className="mb-5 flex items-start justify-between gap-3">
            <h3
              className="text-[20px] tracking-[-0.4px] leading-tight"
              style={{ color: T.ink, fontWeight: 500 }}
            >
              {routine.title}
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

          <div className="border-b mb-2" style={{ borderColor: T.border }}>
            <div className="mb-4 py-3 flex items-center justify-between gap-3 border-b" style={{ borderColor: T.border }}>
              <p className="text-[16px]" style={{ color: T.inkMuted }}>Type</p>
              <span
                className="text-[13px] px-3 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.08)', color: T.ink, fontWeight: 500 }}
              >
                Routine
              </span>
            </div>
            <div className="py-3 flex items-center justify-between gap-3">
              <p className="text-[16px]" style={{ color: T.inkMuted }}>State</p>
              <span
                className="text-[13px] px-3 py-1 rounded-full"
                style={{
                  background: routine.enabled
                    ? 'rgba(74, 199, 121, 0.16)'
                    : 'rgba(255,255,255,0.06)',
                  color: routine.enabled ? T.success : T.inkMuted,
                  fontWeight: 500,
                }}
              >
                {routine.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          <div className="pt-4">
            <p
              className="text-[13px] uppercase tracking-[0.6px] mb-3"
              style={{ color: T.inkFaint, fontWeight: 600 }}
            >
              Description
            </p>
            <p className="text-[15px] leading-[1.5]" style={{ color: T.ink }}>
              {routine.description}
            </p>
          </div>
        </>
      )}
    </BottomSheet>
  )
}
