'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Info, LogOut, UserCircle } from 'lucide-react'

const T = {
  brand: 'var(--color-brand)',
  card: 'var(--color-card)',
  border: 'var(--color-card-border)',
  ink: 'var(--color-ink)',
  inkMuted: 'var(--color-ink-muted)',
  page: 'var(--color-page)',
  danger: 'var(--color-danger)',
  display: 'var(--font-display)',
  text: 'var(--font-text)',
} as const

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
    <div
      className="flex flex-col gap-4 p-5"
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 20,
      }}
    >
      <div className="flex items-center gap-2.5">
        <UserCircle size={22} strokeWidth={1.75} color={T.ink} />
        <h2
          className="text-[22px] leading-none"
          style={{
            fontFamily: T.display,
            fontWeight: 500,
            color: T.ink,
          }}
        >
          Account
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => router.push('/about-me')}
          className="flex items-center justify-between px-4 transition-opacity hover:opacity-80"
          style={{
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            height: 52,
          }}
        >
          <span className="flex items-center gap-3">
            <Info size={18} strokeWidth={2} color={T.ink} />
            <span
              className="text-[16px]"
              style={{ color: T.ink, fontFamily: T.text }}
            >
              About Me
            </span>
          </span>
          <ChevronRight size={18} strokeWidth={2} color={T.ink} />
        </button>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center justify-between px-4 transition-opacity hover:opacity-80 disabled:opacity-60"
          style={{
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            height: 52,
          }}
        >
          <span className="flex items-center gap-3">
            <LogOut size={18} strokeWidth={2} color={T.danger} />
            <span
              className="text-[16px]"
              style={{ color: T.danger, fontFamily: T.text, fontWeight: 500 }}
            >
              {loggingOut ? 'Logging out…' : 'Log Out'}
            </span>
          </span>
        </button>
      </div>
    </div>
  )
}
