'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { T } from '@/lib/theme'
import { Toggle } from '@/components/ui/toggle'
import { SettingsCard } from './settings-card'

export function NotificationsCard() {
  const [budgetAlerts, setBudgetAlerts] = useState(true)
  const [weeklyReports, setWeeklyReports] = useState(true)

  return (
    <SettingsCard title="Notifications" icon={Bell} gap={5}>
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
    </SettingsCard>
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
