'use client'

import { useEffect, useState } from 'react'
import { User } from 'lucide-react'
import { T } from '@/lib/theme'
import { SettingsCard } from './settings-card'

const STORAGE_KEY = 'mr-ducky:profile'

interface ProfileCardProps {
  initialName?: string
  initialEmail?: string
  initialCurrency?: string
}

export function ProfileCard({
  initialName = 'Clara Pato',
  initialEmail = 'clara.pato@gmail.com',
  initialCurrency = 'EUR €',
}: ProfileCardProps) {
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [currency, setCurrency] = useState(initialCurrency)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { name?: string; email?: string; currency?: string }
      if (typeof parsed.name === 'string') setName(parsed.name)
      if (typeof parsed.email === 'string') setEmail(parsed.email)
      if (typeof parsed.currency === 'string') setCurrency(parsed.currency)
    } catch {
      // ignore corrupted storage
    }
  }, [])

  const handleSave = () => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ name, email, currency }),
      )
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1800)
    } catch {
      // ignore storage failures
    }
  }

  return (
    <SettingsCard title="Profile" icon={User} gap={5}>
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
        onClick={handleSave}
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
        {saved ? 'Saved' : 'Save Changes'}
      </button>
    </SettingsCard>
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
