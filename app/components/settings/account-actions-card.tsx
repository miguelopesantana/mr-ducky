'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, LogOut, ShieldCheck, UserCircle } from 'lucide-react'
import { SettingsCard } from './settings-card'
import { SettingsRow } from './settings-row'

export function AccountActionsCard() {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore network errors — cookie may have been cleared anyway
    }
    router.push('/login')
    router.refresh()
  }

  return (
    <SettingsCard title="Account" icon={UserCircle}>
      <div className="flex flex-col gap-3">
        <SettingsRow label="Change Password" icon={KeyRound} />
        <SettingsRow label="Two-Factor Authentication" icon={ShieldCheck} />
        <SettingsRow
          label={loggingOut ? 'Logging out…' : 'Log Out'}
          icon={LogOut}
          tone="danger"
          showChevron={false}
          disabled={loggingOut}
          onClick={handleLogout}
        />
      </div>
    </SettingsCard>
  )
}
