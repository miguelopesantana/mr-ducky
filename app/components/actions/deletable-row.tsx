'use client'

import type { ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { T } from '@/lib/theme'

const SLOT_WIDTH = 48
const EASE = 'cubic-bezier(0.2, 0.7, 0.2, 1)'
const DURATION = '220ms'

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
    <div className="relative" style={{ overflow: 'hidden' }}>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete this action"
        tabIndex={deleteMode ? 0 : -1}
        className="absolute size-9 rounded-full inline-flex items-center justify-center"
        style={{
          color: T.danger,
          left: 0,
          top: '50%',
          transform: `translateY(-50%) translateX(${deleteMode ? 0 : '-110%'})`,
          opacity: deleteMode ? 1 : 0,
          pointerEvents: deleteMode ? 'auto' : 'none',
          transition: `transform ${DURATION} ${EASE}, opacity ${DURATION} ${EASE}`,
        }}
      >
        <Trash2 size={20} strokeWidth={2} />
      </button>
      <div
        style={{
          transform: deleteMode ? `translateX(${SLOT_WIDTH}px)` : 'translateX(0)',
          transition: `transform ${DURATION} ${EASE}`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
