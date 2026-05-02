'use client'

import { ChevronRight, MessageSquare, MoreHorizontal, Trash2 } from 'lucide-react'
import { Menu } from '@base-ui/react/menu'
import { Switch } from '@base-ui/react/switch'
import { T } from '@/lib/theme'
import { SelectionCheckbox } from './selection-checkbox'
import type { Routine } from './types'

export function RoutineCard({
  routine,
  selectMode,
  selected,
  onToggleEnabled,
  onDelete,
  onToggleSelect,
}: {
  routine: Routine
  selectMode: boolean
  selected: boolean
  onToggleEnabled: () => void
  onDelete: () => void
  onToggleSelect: () => void
}) {
  const card = (
    <div
      className="p-5 flex flex-col gap-4 transition-colors"
      style={{
        background: T.card,
        border: `1px solid ${selected ? T.brand : T.border}`,
        borderRadius: 16,
      }}
    >
      <div className="flex items-start justify-between">
        {selectMode ? (
          <SelectionCheckbox checked={selected} />
        ) : (
          <RoutineMenu onDelete={onDelete} />
        )}
        {selectMode ? null : (
          <Switch.Root
            checked={routine.enabled}
            onCheckedChange={onToggleEnabled}
            className="relative h-7 w-12 rounded-full transition-colors"
            style={{ background: routine.enabled ? T.success : '#3a3a3a' }}
            aria-label={`Toggle ${routine.title}`}
          >
            <Switch.Thumb
              className="absolute top-0.5 left-0.5 size-6 rounded-full bg-white transition-transform"
              style={{
                transform: routine.enabled ? 'translateX(20px)' : 'translateX(0)',
              }}
            />
          </Switch.Root>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <p
          className="text-[18px] tracking-[-0.4px]"
          style={{ color: T.ink, fontWeight: 500 }}
        >
          {routine.title}
        </p>
        <p className="text-[14px] leading-5" style={{ color: T.inkMuted }}>
          {routine.description}
        </p>
      </div>
    </div>
  )

  if (!selectMode) return card

  return (
    <button
      type="button"
      onClick={onToggleSelect}
      className="text-left w-full"
      aria-pressed={selected}
    >
      {card}
    </button>
  )
}

function RoutineMenu({ onDelete }: { onDelete: () => void }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className="size-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
        style={{ border: `1.5px solid ${T.brand}`, color: T.brand }}
        aria-label="Routine menu"
      >
        <MoreHorizontal size={14} strokeWidth={2.5} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="start">
          <Menu.Popup
            className="rounded-2xl py-1 min-w-[240px] outline-none"
            style={{
              background: '#2a2a2a',
              border: '1px solid #3a3a3a',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            }}
          >
            <Menu.Item
              className="flex items-center justify-between gap-3 px-4 py-3 text-[16px] tracking-[-0.3px] cursor-default outline-none [&[data-highlighted]]:bg-[#3a3a3a]"
              style={{ color: T.ink }}
            >
              <span className="flex items-center gap-3">
                <MessageSquare size={18} strokeWidth={2} />
                Edit routine in chat
              </span>
              <ChevronRight size={16} strokeWidth={2} style={{ color: T.inkMuted }} />
            </Menu.Item>
            <div className="mx-4 my-0.5 h-px" style={{ background: '#3a3a3a' }} />
            <Menu.Item
              onClick={onDelete}
              className="flex items-center gap-3 px-4 py-3 text-[16px] tracking-[-0.3px] cursor-default outline-none [&[data-highlighted]]:bg-[#3a3a3a]"
              style={{ color: T.danger }}
            >
              <Trash2 size={18} strokeWidth={2} />
              Delete routine
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
