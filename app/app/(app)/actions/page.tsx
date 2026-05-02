'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { ActionsTabs, type ActionTab } from '@/components/actions/actions-tabs'
import { CallCard } from '@/components/actions/call-card'
import { RoutineCard } from '@/components/actions/routine-card'
import { PageCta } from '@/components/actions/page-cta'
import { INITIAL_CALLS, INITIAL_ROUTINES } from '@/components/actions/mock-data'
import type { Call, Routine } from '@/components/actions/types'
import { T } from '@/lib/theme'

export default function ActionsPage() {
  const [tab, setTab] = useState<ActionTab>('calls')
  const [calls, setCalls] = useState<Call[]>(INITIAL_CALLS)
  const [routines, setRoutines] = useState<Routine[]>(INITIAL_ROUTINES)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelected(new Set())
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleRoutineEnabled = (id: string) => {
    setRoutines(prev =>
      prev.map(r => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    )
  }

  const deleteRoutine = (id: string) => {
    setRoutines(prev => prev.filter(r => r.id !== id))
  }

  const deleteSelected = () => {
    setCalls(prev => prev.filter(c => !selected.has(c.id)))
    setRoutines(prev => prev.filter(r => !selected.has(r.id)))
    exitSelectMode()
  }

  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-col gap-6 px-4 pt-4">
      <PageHeader
        title="Actions"
        subtitle="Smart recommendations to improve your financial health"
        action={
          <SelectToggle
            active={selectMode}
            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
          />
        }
      />

      <ActionsTabs tab={tab} onChange={setTab} />

      <PageCta
        tab={tab}
        selectMode={selectMode}
        selectedCount={selected.size}
        onCreate={() => {
          // TODO: open create flow for the active tab
        }}
        onDelete={deleteSelected}
      />

      <div className="flex flex-col gap-4">
        {tab === 'calls' ? (
          calls.length === 0 ? (
            <EmptyState message="No calls yet. Request one to get started." />
          ) : (
            calls.map(call => (
              <CallCard
                key={call.id}
                call={call}
                selectMode={selectMode}
                selected={selected.has(call.id)}
                onToggleSelect={() => toggleSelect(call.id)}
              />
            ))
          )
        ) : routines.length === 0 ? (
          <EmptyState message="No routines yet. Create one to get started." />
        ) : (
          routines.map(routine => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              selectMode={selectMode}
              selected={selected.has(routine.id)}
              onToggleEnabled={() => toggleRoutineEnabled(routine.id)}
              onDelete={() => deleteRoutine(routine.id)}
              onToggleSelect={() => toggleSelect(routine.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function SelectToggle({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? 'Cancel selection' : 'Select actions'}
      aria-pressed={active}
      className="size-9 rounded-full inline-flex items-center justify-center transition-colors"
      style={{
        background: active ? T.brand : 'transparent',
        border: `1.5px solid ${active ? T.brand : T.border}`,
        color: active ? '#1A1A1A' : T.ink,
      }}
    >
      {active ? <X size={18} strokeWidth={2.25} /> : <Check size={18} strokeWidth={2.25} />}
    </button>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-[14px] py-6 text-center" style={{ color: T.inkMuted }}>
      {message}
    </p>
  )
}
