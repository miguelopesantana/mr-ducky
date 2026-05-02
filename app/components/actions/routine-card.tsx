'use client'

import { Switch } from '@base-ui/react/switch'
import { T } from '@/lib/theme'
import type { Routine } from './types'

export function RoutineCard({
  routine,
  onToggleEnabled,
}: {
  routine: Routine
  onToggleEnabled: () => void
}) {
  return (
    <div
      className="p-5 flex flex-col gap-4"
      style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16 }}
    >
      <Switch.Root
        checked={routine.enabled}
        onCheckedChange={onToggleEnabled}
        className="relative h-7 w-12 rounded-full transition-colors self-start"
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
}
