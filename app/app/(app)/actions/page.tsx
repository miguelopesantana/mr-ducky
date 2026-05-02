'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { ActionsTabs, type ActionTab } from '@/components/actions/actions-tabs'
import { CallCard } from '@/components/actions/call-card'
import { RoutineCard } from '@/components/actions/routine-card'
import { PageCta } from '@/components/actions/page-cta'
import { DeletableRow } from '@/components/actions/deletable-row'
import { DeleteConfirmDialog } from '@/components/actions/delete-confirm-dialog'
import { INITIAL_CALLS, INITIAL_ROUTINES } from '@/components/actions/mock-data'
import type { Call, Routine } from '@/components/actions/types'
import { T } from '@/lib/theme'

export default function ActionsPage() {
  const [tab, setTab] = useState<ActionTab>('calls')
  const [calls, setCalls] = useState<Call[]>(INITIAL_CALLS)
  const [routines, setRoutines] = useState<Routine[]>(INITIAL_ROUTINES)
  const [deleteMode, setDeleteMode] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const toggleRoutineEnabled = (id: string) => {
    setRoutines(prev =>
      prev.map(r => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    )
  }

  const confirmDelete = () => {
    if (!pendingDeleteId) return
    setCalls(prev => prev.filter(c => c.id !== pendingDeleteId))
    setRoutines(prev => prev.filter(r => r.id !== pendingDeleteId))
  }

  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-col gap-6 px-4 pt-4">
      <PageHeader
        title="Actions"
        subtitle="Smart recommendations to improve your financial health"
      />

      <ActionsTabs tab={tab} onChange={setTab} />

      <PageCta
        tab={tab}
        deleteMode={deleteMode}
        onCreate={() => {
          // TODO: open create flow for the active tab
        }}
        onToggleDeleteMode={() => setDeleteMode(prev => !prev)}
      />

      <div className="flex flex-col gap-4">
        {tab === 'calls' ? (
          calls.length === 0 ? (
            <EmptyState message="No calls yet. Request one to get started." />
          ) : (
            calls.map(call => (
              <DeletableRow
                key={call.id}
                deleteMode={deleteMode}
                onDelete={() => setPendingDeleteId(call.id)}
              >
                <CallCard call={call} disableLink={deleteMode} />
              </DeletableRow>
            ))
          )
        ) : routines.length === 0 ? (
          <EmptyState message="No routines yet. Create one to get started." />
        ) : (
          routines.map(routine => (
            <DeletableRow
              key={routine.id}
              deleteMode={deleteMode}
              onDelete={() => setPendingDeleteId(routine.id)}
            >
              <RoutineCard
                routine={routine}
                onToggleEnabled={() => toggleRoutineEnabled(routine.id)}
              />
            </DeletableRow>
          ))
        )}
      </div>

      <DeleteConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={open => {
          if (!open) setPendingDeleteId(null)
        }}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-[14px] py-6 text-center" style={{ color: T.inkMuted }}>
      {message}
    </p>
  )
}
