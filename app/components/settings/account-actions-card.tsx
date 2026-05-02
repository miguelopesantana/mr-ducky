'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Info, LogOut, UserCircle } from 'lucide-react'
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
        <SettingsRow
          label="About Me"
          icon={Info}
          onClick={() => router.push('/about-me')}
        />
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
