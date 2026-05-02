'use client'

import type { ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { T } from '@/lib/theme'

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
    <div className="flex items-center gap-3 overflow-hidden">
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete this action"
        tabIndex={deleteMode ? 0 : -1}
        className="shrink-0 size-9 rounded-full inline-flex items-center justify-center transition-all"
        style={{
          color: T.danger,
          opacity: deleteMode ? 1 : 0,
          transform: deleteMode ? 'translateX(0)' : 'translateX(-100%)',
          marginLeft: deleteMode ? 0 : '-3rem',
          pointerEvents: deleteMode ? 'auto' : 'none',
        }}
      >
        <Trash2 size={20} strokeWidth={2} />
      </button>
      <div className="flex-1 min-w-0 transition-transform">{children}</div>
    </div>
  )
}
