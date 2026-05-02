'use client'

import { useState } from 'react'
import { User } from 'lucide-react'

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

interface ProfileCardProps {
  initialName?: string
  initialEmail?: string
  initialCurrency?: string
}

export function ProfileCard({
  initialName = '',
  initialEmail = '',
  initialCurrency = 'EUR €',
}: ProfileCardProps) {
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [currency, setCurrency] = useState(initialCurrency)

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
        <User size={22} strokeWidth={1.75} color={T.ink} />
        <h2
          className="text-[22px] leading-none"
          style={{
            fontFamily: T.display,
            fontWeight: 500,
            color: T.ink,
          }}
        >
          Profile
        </h2>
      </div>

      <Field label="Full Name">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-transparent outline-none"
          style={{ color: T.ink, fontFamily: T.text, fontSize: 16 }}
        />
      </Field>

      <Field label="Email">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="w-full bg-transparent outline-none"
          style={{ color: T.ink, fontFamily: T.text, fontSize: 16 }}
        />
      </Field>

      <Field label="Currency">
        <input
          type="text"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full bg-transparent outline-none"
          style={{ color: T.ink, fontFamily: T.text, fontSize: 16 }}
        />
      </Field>

      <button
        type="button"
        className="mt-1 w-full transition-opacity hover:opacity-90 active:translate-y-px"
        style={{
          background: T.brand,
          color: T.page,
          borderRadius: 14,
          height: 52,
          fontFamily: T.text,
          fontWeight: 500,
          fontSize: 17,
        }}
      >
        Save Changes
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span
        className="text-[14px] leading-none"
        style={{ color: T.inkMuted, fontFamily: T.text }}
      >
        {label}
      </span>
      <div
        className="px-4 py-3.5"
        style={{
          border: `1px solid ${T.border}`,
          borderRadius: 12,
        }}
      >
        {children}
      </div>
    </label>
  )
}
