'use client'

import type { ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { T } from '@/lib/theme'

const SLOT_WIDTH = 48

export function DeletableRow({
  deleteMode,
  onDelete,
  children,
}: {
  deleteMode: boolean
  onDelete: () => void
  children: ReactNode
}) {
  return (
    <div style={{ overflow: 'hidden' }}>
      <div
        className="flex items-center gap-3 transition-transform"
        style={{
          width: `calc(100% + ${SLOT_WIDTH}px)`,
          transform: deleteMode ? 'translateX(0)' : `translateX(-${SLOT_WIDTH}px)`,
          transitionDuration: '220ms',
          transitionTimingFunction: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
        }}
      >
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete this action"
          tabIndex={deleteMode ? 0 : -1}
          className="shrink-0 size-9 rounded-full inline-flex items-center justify-center transition-opacity"
          style={{
            color: T.danger,
            opacity: deleteMode ? 1 : 0,
            pointerEvents: deleteMode ? 'auto' : 'none',
          }}
        >
          <Trash2 size={20} strokeWidth={2} />
        </button>
        <div className="shrink-0" style={{ width: `calc(100% - ${SLOT_WIDTH}px)` }}>
          {children}
        </div>
      </div>
    </div>
  )
}
