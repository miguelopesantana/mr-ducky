'use client'

import { useState } from 'react'
import { ChevronRight, MessageSquare, MoreHorizontal, Plus, Trash2, Sparkles } from 'lucide-react'
import { Menu } from '@base-ui/react/menu'
import { Switch } from '@base-ui/react/switch'
import { PageHeader } from '@/components/layout/page-header'
import { T } from '@/lib/theme'

type Tab = 'mine' | 'suggestions'

interface ActionItem {
  id: string
  title: string
  description: string
  enabled: boolean
}

const INITIAL_MINE: ActionItem[] = [
  {
    id: 'save-10',
    title: 'Subscriptions',
    description:
      'Categorize transactions automatically based on category goals.',
    enabled: true,
  },
]

const INITIAL_SUGGESTIONS: ActionItem[] = [
  {
    id: 'cap-dining',
    title: 'Cap dining out at €200/month',
    description:
      'Get a heads-up when you cross 75% of your dining budget.',
    enabled: false,
  },
  {
    id: 'review-subs',
    title: 'Review subscriptions monthly',
    description:
      'Surface unused or duplicate subscriptions on the 1st of each month.',
    enabled: false,
  },
]

export default function ActionsPage() {
  const [tab, setTab] = useState<Tab>('mine')
  const [mine, setMine] = useState<ActionItem[]>(INITIAL_MINE)
  const [suggestions, setSuggestions] =
    useState<ActionItem[]>(INITIAL_SUGGESTIONS)

  const items = tab === 'mine' ? mine : suggestions
  const setItems = tab === 'mine' ? setMine : setSuggestions

  const toggle = (id: string) => {
    setItems(prev =>
      prev.map(a => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
    )
  }

  const remove = (id: string) => {
    setItems(prev => prev.filter(a => a.id !== id))
  }

  const useSuggestion = (id: string) => {
    const suggestion = suggestions.find(a => a.id === id)
    if (!suggestion) return
    setSuggestions(prev => prev.filter(a => a.id !== id))
    setMine(prev => [...prev, { ...suggestion, enabled: true }])
    setTab('mine')
  }

  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-col gap-6 px-4 pt-4">
      <PageHeader
        title="Actions"
        subtitle="Smart recommendations to improve your financial health"
      />

      {/* Tabs */}
      <div
        className="flex p-1 rounded-[8px]"
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
        }}
        role="tablist"
      >
        <TabButton
          active={tab === 'mine'}
          onClick={() => setTab('mine')}
          label="My Actions"
        />
        <TabButton
          active={tab === 'suggestions'}
          onClick={() => setTab('suggestions')}
          label="Suggestions"
        />
      </div>

      {/* Add Action — only on My Actions */}
      {tab === 'mine' && (
        <button
          type="button"
          className="w-full py-2 rounded-[8px] flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            color: T.ink,
            fontWeight: 500,
          }}
        >
          <Plus size={18} strokeWidth={2.25} />
          <span className="text-[16px] tracking-[-0.3px]">Add Action</span>
        </button>
      )}

      {/* List */}
      <div className="flex flex-col gap-4">
        {items.length === 0 ? (
          <p className="text-[14px] py-6 text-center" style={{ color: T.inkMuted }}>
            {tab === 'mine'
              ? 'No actions yet. Add one to get started.'
              : 'No suggestions right now.'}
          </p>
        ) : tab === 'mine' ? (
          items.map(action => (
            <ActionCard
              key={action.id}
              action={action}
              onToggle={() => toggle(action.id)}
              onDelete={() => remove(action.id)}
            />
          ))
        ) : (
          items.map(action => (
            <SuggestionCard
              key={action.id}
              action={action}
              onUse={() => useSuggestion(action.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="flex-1 py-2 rounded-[8px] text-[16px] transition-colors"

      style={{
        background: active ? T.brand : 'transparent',
        color: active ? '#1A1A1A' : T.ink,
        fontWeight: 500,
        fontFamily: T.display,
      }}
    >
      {label}
    </button>
  )
}

function ActionCard({
  action,
  onToggle,
  onDelete,
}: {
  action: ActionItem
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div
      className="p-5 flex flex-col gap-4"
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
      }}
    >
      <div className="flex items-start justify-between">
        <ActionMenu onDelete={onDelete} />
        <Switch.Root
          checked={action.enabled}
          onCheckedChange={onToggle}
          className="relative h-7 w-12 rounded-full transition-colors"
          style={{ background: action.enabled ? T.success : '#3a3a3a' }}
          aria-label={`Toggle ${action.title}`}
        >
          <Switch.Thumb
            className="absolute top-0.5 left-0.5 size-6 rounded-full bg-white transition-transform"
            style={{ transform: action.enabled ? 'translateX(20px)' : 'translateX(0)' }}
          />
        </Switch.Root>
      </div>

      <div className="flex flex-col gap-1.5">
        <p
          className="text-[18px] tracking-[-0.4px]"
          style={{
            color: T.ink,
            fontWeight: 500,
          }}
        >
          {action.title}
        </p>
        <p
          className="text-[14px] leading-5"
          style={{ color: T.inkMuted }}
        >
          {action.description}
        </p>
      </div>
    </div>
  )
}

function SuggestionCard({
  action,
  onUse,
}: {
  action: ActionItem
  onUse: () => void
}) {
  return (
    <div
      className="p-5 flex flex-col gap-4"
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
      }}
    >
      <div
        className="size-7 rounded-full flex items-center justify-center"
        style={{
          border: `1.5px solid ${T.brand}`,
          color: T.brand,
        }}
      >
        <Sparkles size={14} strokeWidth={2.5} />
      </div>

      <div className="flex flex-col gap-1.5">
        <p
          className="text-[18px] tracking-[-0.4px]"
          style={{
            color: T.ink,
            fontWeight: 500,
          }}
        >
          {action.title}
        </p>
        <p
          className="text-[14px] leading-5"
          style={{ color: T.inkMuted }}
        >
          {action.description}
        </p>
      </div>

      <button
        type="button"
        onClick={onUse}
        className="w-full py-2 rounded-[8px] flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
        style={{
          background: T.brand,
          color: '#1A1A1A',
          fontWeight: 500,
          fontFamily: T.display,
        }}
      >
        <Plus size={18} strokeWidth={2.25} />
        <span className="text-[16px] tracking-[-0.3px]">Use action</span>
      </button>
    </div>
  )
}

function ActionMenu({ onDelete }: { onDelete: () => void }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className="size-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
        style={{
          border: `1.5px solid ${T.brand}`,
          color: T.brand,
        }}
        aria-label="Action menu"
      >
        <MoreHorizontal size={14} strokeWidth={2.5} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="start">
          <Menu.Popup
            className="rounded-2xl py-1 min-w-[240px] outline-none"
            style={{
              background: '#2a2a2a',
              border: `1px solid #3a3a3a`,
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            }}
          >
            <Menu.Item
              className="flex items-center justify-between gap-3 px-4 py-3 text-[16px] tracking-[-0.3px] cursor-default outline-none [&[data-highlighted]]:bg-[#3a3a3a]"
              style={{ color: T.ink }}
            >
              <span className="flex items-center gap-3">
                <MessageSquare size={18} strokeWidth={2} />
                Edit action in chat
              </span>
              <ChevronRight size={16} strokeWidth={2} style={{ color: T.inkMuted }} />
            </Menu.Item>
            <div
              className="mx-4 my-0.5 h-px"
              style={{ background: '#3a3a3a' }}
            />
            <Menu.Item
              onClick={onDelete}
              className="flex items-center gap-3 px-4 py-3 text-[16px] tracking-[-0.3px] cursor-default outline-none [&[data-highlighted]]:bg-[#3a3a3a]"
              style={{ color: T.danger }}
            >
              <Trash2 size={18} strokeWidth={2} />
              Delete action
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
