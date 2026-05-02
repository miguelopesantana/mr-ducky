'use client'

import { Plus, Trash2 } from 'lucide-react'
import { T } from '@/lib/theme'
import type { ActionTab } from './actions-tabs'

interface PageCtaProps {
  tab: ActionTab
  selectMode: boolean
  selectedCount: number
  onCreate: () => void
  onDelete: () => void
}

export function PageCta({ tab, selectMode, selectedCount, onCreate, onDelete }: PageCtaProps) {
  if (selectMode) {
    const disabled = selectedCount === 0
    return (
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        className="w-full py-2 rounded-[8px] flex items-center justify-center gap-2 transition-opacity"
        style={{
          background: disabled ? T.card : 'rgba(239, 92, 92, 0.16)',
          border: `1px solid ${disabled ? T.border : 'rgba(239, 92, 92, 0.4)'}`,
          color: disabled ? T.inkMuted : T.danger,
          fontWeight: 500,
          opacity: disabled ? 1 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <Trash2 size={18} strokeWidth={2.25} />
        <span className="text-[16px] tracking-[-0.3px]">
          {disabled ? 'Delete' : `Delete ${selectedCount}`}
        </span>
      </button>
    )
  }

  const label = tab === 'calls' ? 'Request call' : 'Create routine'
  return (
    <button
      type="button"
      onClick={onCreate}
      className="w-full py-2 rounded-[8px] flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
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
  )
}
