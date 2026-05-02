'use client'

import { Check, Plus, Trash2 } from 'lucide-react'
import { T } from '@/lib/theme'
import type { ActionTab } from './actions-tabs'

export function PageCta({
  tab,
  deleteMode,
  onCreate,
  onToggleDeleteMode,
}: {
  tab: ActionTab
  deleteMode: boolean
  onCreate: () => void
  onToggleDeleteMode: () => void
}) {
  const label = tab === 'calls' ? 'Request call' : 'Create routine'
  return (
    <div className="flex items-stretch gap-2">
      <button
        type="button"
        onClick={onCreate}
        className="flex-1 py-2 rounded-[8px] flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          color: T.ink,
          fontWeight: 500,
        }}
      >
        <Plus size={18} strokeWidth={2.25} />
        <span className="text-[16px] tracking-[-0.3px]">{label}</span>
      </button>
      <button
        type="button"
        onClick={onToggleDeleteMode}
        aria-label={deleteMode ? 'Done deleting' : 'Enter delete mode'}
        aria-pressed={deleteMode}
        className="aspect-square h-auto rounded-[8px] inline-flex items-center justify-center transition-colors"
        style={{
          background: deleteMode ? T.brand : T.card,
          border: `1px solid ${deleteMode ? T.brand : T.border}`,
          color: deleteMode ? '#1A1A1A' : T.ink,
          width: 44,
        }}
      >
        {deleteMode ? <Check size={18} strokeWidth={2.5} /> : <Trash2 size={18} strokeWidth={2} />}
      </button>
    </div>
  )
}
