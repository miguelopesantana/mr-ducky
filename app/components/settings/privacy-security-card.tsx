'use client'

import { Database } from 'lucide-react'
import { SettingsCard } from './settings-card'
import { SettingsRow } from './settings-row'

const ITEMS: { label: string; key: string }[] = [
  { key: 'connected-accounts', label: 'Connected Accounts' },
  { key: 'data-export', label: 'Data Export' },
]

export function PrivacySecurityCard({
  onSelect,
}: {
  onSelect?: (key: string) => void
}) {
  return (
    <SettingsCard title="Data" icon={Database}>
      <div className="flex flex-col gap-3">
        {ITEMS.map((item) => (
          <SettingsRow
            key={item.key}
            label={item.label}
            onClick={() => onSelect?.(item.key)}
          />
        ))}
      </div>
    </SettingsCard>
  )
}
