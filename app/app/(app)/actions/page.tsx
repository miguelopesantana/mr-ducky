'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Switch } from '@base-ui/react/switch'
import { PageHeader } from '@/components/layout/page-header'
import { ActionsTabs, type ActionTab } from '@/components/actions/actions-tabs'
import { ActionCard } from '@/components/actions/action-card'
import { CallStatusBadge } from '@/components/actions/call-status-badge'
import { PageCta } from '@/components/actions/page-cta'
import { DeletableRow } from '@/components/actions/deletable-row'
import { DeleteConfirmDialog } from '@/components/actions/delete-confirm-dialog'
import { CallDetailSheet } from '@/components/actions/call-detail-sheet'
import { RoutineDetailSheet } from '@/components/actions/routine-detail-sheet'
import { INITIAL_ROUTINES } from '@/components/actions/mock-data'
import { CALL_STATUS_RANK, type Call, type Routine } from '@/components/actions/types'
import { T } from '@/lib/theme'

export default function ActionsPage() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [tab, setTab] = useState<ActionTab>(tabParam === 'routines' ? 'routines' : 'calls')
  const [calls, setCalls] = useState<Call[]>([])
  const [routines, setRoutines] = useState<Routine[]>(INITIAL_ROUTINES)
  const [deleteMode, setDeleteMode] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [selectedCall, setSelectedCall] = useState<Call | null>(null)
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null)

  useEffect(() => {
    fetch('/api/calls')
      .then((r) => r.json())
      .then((data: { items: Call[] }) => setCalls(data.items ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (tabParam === 'calls' || tabParam === 'routines') setTab(tabParam)
  }, [tabParam])

  const toggleRoutineEnabled = (id: string) => {
    setRoutines(prev =>
      prev.map(r => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    )
  }

  const sortedCalls = [...calls].sort(
    (a, b) => CALL_STATUS_RANK[a.status] - CALL_STATUS_RANK[b.status],
  )

  const confirmDelete = async () => {
    if (!pendingDeleteId) return
    if (tab === 'calls') {
      await fetch(`/api/calls/${pendingDeleteId}`, { method: 'DELETE' })
      setCalls(prev => prev.filter(c => c.id !== pendingDeleteId))
    } else {
      setRoutines(prev => prev.filter(r => r.id !== pendingDeleteId))
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-col gap-6 px-4 pt-4">
      <PageHeader
        title="Actions"
        subtitle="Things Mr. Ducky handles on your behalf"
      />

      <ActionsTabs tab={tab} onChange={setTab} />

      <PageCta
        tab={tab}
        deleteMode={deleteMode}
        onCreate={() => {
          // TODO: redirect to chat to create a new call
        }}
        onToggleDeleteMode={() => setDeleteMode(prev => !prev)}
      />

      <div className="flex flex-col gap-4">
        {tab === 'calls' ? (
          sortedCalls.length === 0 ? (
            <EmptyState message="No calls yet. Ask Mr. Ducky in chat to negotiate a bill." />
          ) : (
            sortedCalls.map(call => (
              <DeletableRow
                key={call.id}
                deleteMode={deleteMode}
                onDelete={() => setPendingDeleteId(call.id)}
              >
                <ActionCard
                  title={call.title}
                  description={call.description}
                  headerAction={<CallStatusBadge status={call.status} />}
                  onViewDetails={deleteMode ? undefined : () => setSelectedCall(call)}
                />
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
              <ActionCard
                title={routine.title}
                description={routine.description}
                headerAction={
                  <Switch.Root
                    checked={routine.enabled}
                    onCheckedChange={() => toggleRoutineEnabled(routine.id)}
                    className="relative h-7 w-12 rounded-full transition-colors shrink-0"
                    style={{ background: routine.enabled ? T.success : '#3a3a3a' }}
                    aria-label={`Toggle ${routine.title}`}
                  >
                    <Switch.Thumb
                      className="absolute top-0.5 left-0.5 size-6 rounded-full bg-white transition-transform"
                      style={{ transform: routine.enabled ? 'translateX(20px)' : 'translateX(0)' }}
                    />
                  </Switch.Root>
                }
                onViewDetails={deleteMode ? undefined : () => setSelectedRoutine(routine)}
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

      <CallDetailSheet call={selectedCall} onClose={() => setSelectedCall(null)} />
      <RoutineDetailSheet routine={selectedRoutine} onClose={() => setSelectedRoutine(null)} />
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
