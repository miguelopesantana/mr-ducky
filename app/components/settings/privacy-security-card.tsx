'use client'

import { ChevronRight, ShieldCheck } from 'lucide-react'

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

const ITEMS: { label: string; key: string }[] = [
  { key: 'change-password', label: 'Change Password' },
  { key: 'two-factor', label: 'Two-Factor Authentication' },
  { key: 'connected-accounts', label: 'Connected Accounts' },
  { key: 'data-export', label: 'Data Export' },
]

export function PrivacySecurityCard({
  onSelect,
}: {
  onSelect?: (key: string) => void
}) {
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
        <ShieldCheck size={22} strokeWidth={1.75} color={T.ink} />
        <h2
          className="text-[22px] leading-none"
          style={{
            fontFamily: T.display,
            fontWeight: 500,
            color: T.ink,
          }}
        >
          Privacy & Security
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        {ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect?.(item.key)}
            className="flex items-center justify-between px-4 transition-opacity hover:opacity-80"
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              height: 52,
            }}
          >
            <span
              className="text-[16px]"
              style={{ color: T.ink, fontFamily: T.text }}
            >
              {item.label}
            </span>
            <ChevronRight size={18} strokeWidth={2} color={T.ink} />
          </button>
        ))}
      </div>
    </div>
  )
}
