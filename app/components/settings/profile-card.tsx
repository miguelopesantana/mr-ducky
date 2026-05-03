'use client'

import { useEffect, useMemo, useState } from 'react'
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
  initialNif?: string
  initialAddress?: string
}

export function ProfileCard({
  initialName = 'Francisca Laureano',
  initialEmail = 'francisca.laureano@gmail.com',
  initialCurrency = 'EUR',
  initialNif = '253672982',
  initialAddress = 'Rua das Flores 23, 3º Esq, 1200-195 Lisboa',
}: ProfileCardProps) {
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [currency, setCurrency] = useState(normalizeCurrency(initialCurrency))
  const [nif, setNif] = useState(initialNif)
  const [address, setAddress] = useState(initialAddress)
  const [baseline, setBaseline] = useState({
    name: initialName,
    email: initialEmail,
    currency: normalizeCurrency(initialCurrency),
    nif: initialNif,
    address: initialAddress,
  })
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        name?: string
        email?: string
        currency?: string
        nif?: string
        address?: string
      }
      const next = {
        name: typeof parsed.name === 'string' ? parsed.name : initialName,
        email: typeof parsed.email === 'string' ? parsed.email : initialEmail,
        currency:
          typeof parsed.currency === 'string'
            ? normalizeCurrency(parsed.currency)
            : normalizeCurrency(initialCurrency),
        nif: typeof parsed.nif === 'string' ? parsed.nif : initialNif,
        address: typeof parsed.address === 'string' ? parsed.address : initialAddress,
      }
      setName(next.name)
      setEmail(next.email)
      setCurrency(next.currency)
      setNif(next.nif)
      setAddress(next.address)
      setBaseline(next)
    } catch {
      // ignore corrupted storage
    }
  }, [initialName, initialEmail, initialCurrency, initialNif, initialAddress])

  const dirty = useMemo(
    () =>
      name !== baseline.name ||
      email !== baseline.email ||
      currency !== baseline.currency ||
      nif !== baseline.nif ||
      address !== baseline.address,
    [name, email, currency, nif, address, baseline],
  )

  const handleSave = () => {
    if (!dirty) return
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ name, email, currency, nif, address }),
      )
      setBaseline({ name, email, currency, nif, address })
      setSaved(true)
      setEditing(false)
      window.setTimeout(() => setSaved(false), 1800)
    } catch {
      // ignore storage failures
    }
  }

  const handleCancel = () => {
    setName(baseline.name)
    setEmail(baseline.email)
    setCurrency(baseline.currency)
    setNif(baseline.nif)
    setAddress(baseline.address)
    setEditing(false)
  }

  const currencyLabel =
    CURRENCY_OPTIONS.find((o) => o.code === currency)?.label ?? currency

  return (
    <SettingsCard
      title="Profile"
      icon={User}
      gap={5}
      headerAction={
        editing ? null : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Edit profile"
            className="transition-opacity hover:opacity-80"
            style={{ color: T.inkMuted }}
          >
            <Pencil size={18} />
          </button>
        )
      }
    >
      <Field label="Full Name">
        {editing ? (
          <InputShell>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full bg-transparent outline-none"
              style={{ color: T.ink, fontFamily: T.text, fontSize: 16 }}
            />
          </InputShell>
        ) : (
          <ReadValue value={name} />
        )}
      </Field>

      <Field label="Email">
        {editing ? (
          <InputShell>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full bg-transparent outline-none"
              style={{ color: T.ink, fontFamily: T.text, fontSize: 16 }}
            />
          </InputShell>
        ) : (
          <ReadValue value={email} />
        )}
      </Field>

      <Field label="Currency">
        {editing ? (
          <InputShell>
            <div className="relative flex w-full items-center">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full appearance-none bg-transparent pr-7 outline-none"
                style={{ color: T.ink, fontFamily: T.text, fontSize: 16 }}
              >
                {CURRENCY_OPTIONS.map((opt) => (
                  // native <option> renders in the OS popup, which uses a light
                  // background — force dark text so it stays readable.
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
          </InputShell>
        ) : (
          <ReadValue value={currencyLabel} />
        )}
      </Field>

      <Field label="NIF">
        {editing ? (
          <InputShell>
            <input
              type="text"
              inputMode="numeric"
              value={nif}
              onChange={(e) => setNif(e.target.value)}
              autoComplete="off"
              className="w-full bg-transparent outline-none"
              style={{ color: T.ink, fontFamily: T.text, fontSize: 16 }}
            />
          </InputShell>
        ) : (
          <ReadValue value={nif} />
        )}
      </Field>

      <Field label="Address">
        {editing ? (
          <div
            className="flex items-start px-4 py-3"
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 12,
            }}
          >
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              autoComplete="street-address"
              className="w-full resize-none bg-transparent outline-none"
              style={{ color: T.ink, fontFamily: T.text, fontSize: 16, lineHeight: 1.4 }}
            />
          </div>
        ) : (
          <div
            className="flex items-center"
            style={{
              minHeight: 50,
              color: T.ink,
              fontFamily: T.text,
              fontSize: 16,
              lineHeight: 1.4,
            }}
          >
            {address}
          </div>
        )}
      </Field>

      {editing ? (
        <div className="mt-1 flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 transition-opacity hover:opacity-80 active:translate-y-px"
            style={{
              color: T.inkMuted,
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              height: 52,
              fontFamily: T.text,
              fontWeight: 500,
              fontSize: 17,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty}
            className="flex-1 transition-opacity hover:opacity-90 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
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
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      ) : null}
    </SettingsCard>
  )
}

function normalizeCurrency(value: string): string {
  const code = value.trim().slice(0, 3).toUpperCase()
  return CURRENCY_OPTIONS.some((o) => o.code === code) ? code : 'EUR'
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span
        className="text-[14px] leading-none"
        style={{ color: T.inkMuted, fontFamily: T.text }}
      >
        {label}
      </span>
      {children}
    </div>
  )
}

function InputShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center px-4"
      style={{
        height: 50,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
      }}
    >
      {children}
    </div>
  )
}

function ReadValue({ value }: { value: string }) {
  return (
    <div
      className="flex items-center"
      style={{
        height: 50,
        color: T.ink,
        fontFamily: T.text,
        fontSize: 16,
      }}
    >
      {value}
    </div>
  )
}
