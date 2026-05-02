'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Pencil, User } from 'lucide-react'
import { T } from '@/lib/theme'
import { SettingsCard } from './settings-card'

const STORAGE_KEY = 'mr-ducky:profile'

const CURRENCY_OPTIONS = [
  { code: 'EUR', label: 'EUR €' },
  { code: 'USD', label: 'USD $' },
  { code: 'GBP', label: 'GBP £' },
  { code: 'JPY', label: 'JPY ¥' },
  { code: 'CHF', label: 'CHF Fr' },
  { code: 'CAD', label: 'CAD $' },
  { code: 'AUD', label: 'AUD $' },
] as const

interface ProfileCardProps {
  initialName?: string
  initialEmail?: string
  initialCurrency?: string
}

export function ProfileCard({
  initialName = 'Clara Pato',
  initialEmail = 'clara.pato@gmail.com',
  initialCurrency = 'EUR',
}: ProfileCardProps) {
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [currency, setCurrency] = useState(normalizeCurrency(initialCurrency))
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { name?: string; email?: string; currency?: string }
      if (typeof parsed.name === 'string') setName(parsed.name)
      if (typeof parsed.email === 'string') setEmail(parsed.email)
      if (typeof parsed.currency === 'string') setCurrency(normalizeCurrency(parsed.currency))
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
      <EditableField
        label="Full Name"
        type="text"
        value={name}
        onChange={setName}
      />

      <EditableField
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
      />

      <Field label="Currency">
        <div className="relative flex items-center">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full appearance-none bg-transparent pr-7 outline-none"
            style={{ color: T.ink, fontFamily: T.text, fontSize: 16 }}
          >
            {CURRENCY_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code} style={{ color: '#000' }}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={18}
            className="pointer-events-none absolute right-0"
            style={{ color: T.inkMuted }}
          />
        </div>
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

function normalizeCurrency(value: string): string {
  const code = value.trim().slice(0, 3).toUpperCase()
  return CURRENCY_OPTIONS.some((o) => o.code === code) ? code : 'EUR'
}

function EditableField({
  label,
  type,
  value,
  onChange,
  autoComplete,
}: {
  label: string
  type: 'text' | 'email'
  value: string
  onChange: (next: string) => void
  autoComplete?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full bg-transparent outline-none"
          style={{ color: T.ink, fontFamily: T.text, fontSize: 16 }}
        />
        <button
          type="button"
          onClick={() => {
            const el = inputRef.current
            if (!el) return
            el.focus()
            el.setSelectionRange(el.value.length, el.value.length)
          }}
          aria-label={`Edit ${label.toLowerCase()}`}
          className="shrink-0 transition-opacity hover:opacity-80"
          style={{ color: T.inkMuted }}
        >
          <Pencil size={16} />
        </button>
      </div>
    </Field>
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
