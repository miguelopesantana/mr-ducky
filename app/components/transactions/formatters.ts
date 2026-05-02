import type { TransactionItem } from '@/lib/finance-data'

export type CategoryOption = { id: number; name: string; icon: string; color: string }

export type FiltersState = {
  q: string
  type: 'all' | 'expense' | 'income'
  categoryIds: number[]
  from: string
  to: string
}

export function formatAmount(cents: number): string {
  const sign = cents >= 0 ? '+' : '-'
  const amount = (Math.abs(cents) / 100).toFixed(2)
  return `${sign}${amount}€`
}

export function formatDateHeader(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`)
  const now = new Date()
  const withYear = d.getFullYear() !== now.getFullYear()
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  })
}

export function transactionTypeLabel(type: TransactionItem['type']): string {
  return type === 'income' ? 'Credit' : 'Debit'
}

export function fmtInputDate(date: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : ''
}

export function fmtDisplayDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return 'DD/MM/YYYY'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function formatFullDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
