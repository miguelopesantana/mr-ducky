'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'

const T = {
  brand: 'var(--color-brand)',
  card: 'var(--color-card)',
  border: 'var(--color-card-border)',
  ink: 'var(--color-ink)',
  inkMuted: 'var(--color-ink-muted)',
  page: 'var(--color-page)',
  display: 'var(--font-display)',
  text: 'var(--font-text)',
} as const

export function NotificationsCard() {
  const [budgetAlerts, setBudgetAlerts] = useState(true)
  const [weeklyReports, setWeeklyReports] = useState(true)

  return (
    <div
      className="flex flex-col gap-5 p-5"
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 20,
      }}
    >
      <div className="flex items-center gap-2.5">
        <Bell size={22} strokeWidth={1.75} color={T.ink} />
        <h2
          className="text-[22px] leading-none"
          style={{
            fontFamily: T.display,
            fontWeight: 500,
            color: T.ink,
          }}
        >
          Notifications
        </h2>
      </div>

      <ToggleRow
        title="Budget Alerts"
        description="Get notified when approaching budget limits"
        checked={budgetAlerts}
        onChange={setBudgetAlerts}
      />

      <ToggleRow
        title="Weekly Reports"
        description="Receive weekly spending summaries"
        checked={weeklyReports}
        onChange={setWeeklyReports}
      />
    </div>
  )
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <span
          className="text-[16px] leading-tight"
          style={{ color: T.ink, fontFamily: T.text, fontWeight: 500 }}
        >
          {title}
        </span>
        <span
          className="text-[14px] leading-snug"
          style={{ color: T.inkMuted, fontFamily: T.text }}
        >
          {description}
        </span>
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative shrink-0 transition-colors"
      style={{
        width: 52,
        height: 30,
        borderRadius: 999,
        background: checked ? T.brand : 'var(--color-card-border)',
      }}
    >
      <span
        className="absolute top-1/2 -translate-y-1/2 transition-all"
        style={{
          left: checked ? 24 : 2,
          width: 26,
          height: 26,
          borderRadius: 999,
          background: T.page,
        }}
      />
    </button>
  )
}
