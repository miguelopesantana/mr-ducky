'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { CalendarDays, Filter, Search, ShoppingCart, X } from 'lucide-react'
import type { TransactionItem } from '@/lib/finance-data'
import { PageHeader } from '@/components/layout/page-header'

const T = {
  brand: 'var(--color-brand)',
  card: 'var(--color-card)',
  border: 'var(--color-card-border)',
  divider: 'var(--color-divider)',
  ink: 'var(--color-ink)',
  inkMuted: 'var(--color-ink-muted)',
  display: 'var(--font-display)',
} as const

type CategoryOption = { id: number; name: string }

type FiltersState = {
  q: string
  type: 'all' | 'expense' | 'income'
  categoryId: number | null
  from: string
  to: string
}

function formatAmount(cents: number): string {
  const sign = cents >= 0 ? '+' : '-'
  const amount = (Math.abs(cents) / 100).toFixed(2)
  return `${sign}${amount}€`
}

function formatDateHeader(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`)
  const now = new Date()
  const withYear = d.getFullYear() !== now.getFullYear()
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  })
}

function categoryGlyph(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('food')) return '🛒'
  if (lower.includes('entertainment')) return '🍿'
  if (lower.includes('income') || lower.includes('salary')) return '💰'
  if (lower.includes('transport') || lower.includes('travel')) return '🚕'
  return '•'
}

function transactionTypeLabel(type: TransactionItem['type']): string {
  return type === 'income' ? 'Credit' : 'Debit'
}

function fmtInputDate(date: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : ''
}

function formatFullDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

type Props = {
  items: TransactionItem[]
  categories: CategoryOption[]
  initialFilters: FiltersState
}

export function TransactionsClient({ items, categories, initialFilters }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [selected, setSelected] = useState<TransactionItem | null>(null)
  const [filters, setFilters] = useState<FiltersState>(initialFilters)

  const categoriesById = useMemo(
    () => new Map(categories.map(category => [category.id, category])),
    [categories],
  )

  const grouped = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          const key = item.occurredAt
          if (!acc[key]) acc[key] = []
          acc[key].push(item)
          return acc
        },
        {} as Record<string, TransactionItem[]>,
      ),
    [items],
  )

  const dates = useMemo(() => Object.keys(grouped), [grouped])

  function applyFilters() {
    const next = new URLSearchParams()
    if (filters.q) next.set('q', filters.q)
    if (filters.type !== 'all') next.set('type', filters.type)
    if (filters.categoryId) next.set('categoryId', String(filters.categoryId))
    if (filters.from) next.set('from', filters.from)
    if (filters.to) next.set('to', filters.to)

    const query = next.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
    setIsFiltersOpen(false)
  }

  function resetFilters() {
    setFilters({
      q: filters.q,
      type: 'all',
      categoryId: null,
      from: '',
      to: '',
    })
  }

  const selectedCategory = selected?.categoryId ? categoriesById.get(selected.categoryId) : null

  return (
    <>
      <div className="mx-auto w-full max-w-[430px] px-4 py-6 flex flex-col gap-6">
        <PageHeader title="Transactions" subtitle="View and manage your transaction history" />

        <form
          className="flex items-center gap-3"
          onSubmit={e => {
            e.preventDefault()
            applyFilters()
          }}
        >
          <div
            className="flex-1 h-12 rounded-2xl border px-4 flex items-center gap-3"
            style={{ background: '#111', borderColor: T.border }}
          >
            <Search size={22} style={{ color: T.ink }} />
            <input
              type="search"
              name="q"
              value={filters.q}
              onChange={e => setFilters(prev => ({ ...prev, q: e.target.value }))}
              placeholder="Search..."
              className="w-full bg-transparent outline-none text-[16px]"
              style={{ color: T.ink }}
              aria-label="Search transactions"
            />
          </div>
          <button
            type="button"
            aria-label="Filter transactions"
            onClick={() => setIsFiltersOpen(true)}
            className="size-12 rounded-2xl inline-flex items-center justify-center"
            style={{ background: T.brand, color: '#111' }}
          >
            <Filter size={24} />
          </button>
        </form>

        <div className="h-px w-full" style={{ background: T.divider }} />

        <section className="flex flex-col gap-8 pb-2">
          {dates.map(date => {
            const dayItems = grouped[date]
            const total = dayItems.reduce((sum, item) => sum + item.amount, 0)
            return (
              <div key={date} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2
                    className="text-[20px] leading-6"
                    style={{ color: T.ink, fontFamily: T.display, fontWeight: 500 }}
                  >
                    {formatDateHeader(date)}
                  </h2>
                  <p
                    className="text-[20px] leading-6"
                    style={{ color: T.ink, fontFamily: T.display, fontWeight: 600 }}
                  >
                    {formatAmount(total)}
                  </p>
                </div>

                {dayItems.map(item => {
                  const category = item.categoryId ? categoriesById.get(item.categoryId) : null
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelected(item)}
                      className="rounded-3xl border px-4 py-3 flex flex-col gap-2 text-left"
                      style={{ background: T.card, borderColor: T.border }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className="text-[16px] leading-5 truncate"
                            style={{ color: T.ink, fontFamily: T.display, fontWeight: 500 }}
                          >
                            {item.merchantName}
                          </p>
                          <p className="text-[13px] leading-4" style={{ color: T.inkMuted }}>
                            {item.bank}
                          </p>
                        </div>
                        <p
                          className="text-[16px] leading-5 shrink-0"
                          style={{
                            color: item.type === 'income' ? 'var(--color-success)' : T.ink,
                            fontFamily: T.display,
                            fontWeight: 600,
                          }}
                        >
                          {formatAmount(item.amount)}
                        </p>
                      </div>

                      {category && (
                        <div
                          className="inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 self-start"
                          style={{ borderColor: T.border, color: T.ink }}
                        >
                          <span aria-hidden className="text-[12px]">
                            {categoryGlyph(category.name)}
                          </span>
                          <span className="text-[13px] leading-4">{category.name}</span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </section>
      </div>

      {(isFiltersOpen || selected) && (
        <div
          className="fixed inset-0 z-50 bg-black/70"
          onClick={() => {
            setIsFiltersOpen(false)
            setSelected(null)
          }}
        />
      )}

      {isFiltersOpen && (
        <section
          className="fixed left-0 right-0 bottom-0 z-[60] mx-auto w-full max-w-[430px] rounded-t-3xl border p-5"
          style={{ background: '#232426', borderColor: '#2f3032' }}
        >
          <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-white/50" />
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-[18px]" style={{ color: T.ink, fontFamily: T.display }}>
              Filters
            </h3>
            <button
              type="button"
              onClick={() => setIsFiltersOpen(false)}
              className="size-8 inline-flex items-center justify-center"
              style={{ color: T.ink }}
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <p className="text-[16px]" style={{ color: T.ink, fontFamily: T.display }}>
                Date Range
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="h-11 rounded-xl border px-3 flex items-center gap-2" style={{ borderColor: T.border }}>
                  <CalendarDays size={16} style={{ color: T.inkMuted }} />
                  <input
                    type="date"
                    value={fmtInputDate(filters.from)}
                    onChange={e => setFilters(prev => ({ ...prev, from: e.target.value }))}
                    className="w-full bg-transparent outline-none text-[13px]"
                    style={{ color: T.ink }}
                  />
                </label>
                <label className="h-11 rounded-xl border px-3 flex items-center gap-2" style={{ borderColor: T.border }}>
                  <CalendarDays size={16} style={{ color: T.inkMuted }} />
                  <input
                    type="date"
                    value={fmtInputDate(filters.to)}
                    onChange={e => setFilters(prev => ({ ...prev, to: e.target.value }))}
                    className="w-full bg-transparent outline-none text-[13px]"
                    style={{ color: T.ink }}
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[16px]" style={{ color: T.ink, fontFamily: T.display }}>
                Category
              </p>
              <div className="flex flex-wrap gap-2">
                <Chip active={filters.categoryId === null} onClick={() => setFilters(prev => ({ ...prev, categoryId: null }))}>
                  All
                </Chip>
                {categories.map(category => (
                  <Chip
                    key={category.id}
                    active={filters.categoryId === category.id}
                    onClick={() => setFilters(prev => ({ ...prev, categoryId: category.id }))}
                  >
                    {category.name}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[16px]" style={{ color: T.ink, fontFamily: T.display }}>
                Transaction Type
              </p>
              <div className="flex gap-2">
                <Chip active={filters.type === 'all'} onClick={() => setFilters(prev => ({ ...prev, type: 'all' }))}>
                  All
                </Chip>
                <Chip active={filters.type === 'expense'} onClick={() => setFilters(prev => ({ ...prev, type: 'expense' }))}>
                  Debit
                </Chip>
                <Chip active={filters.type === 'income'} onClick={() => setFilters(prev => ({ ...prev, type: 'income' }))}>
                  Credit
                </Chip>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="h-11 px-4 rounded-xl border text-[14px]"
              style={{ borderColor: T.border, color: T.ink }}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={applyFilters}
              className="h-11 flex-1 rounded-xl text-[14px]"
              style={{ background: T.brand, color: '#111', fontWeight: 600 }}
            >
              Apply Filters
            </button>
          </div>
        </section>
      )}

      {selected && (
        <section
          className="fixed left-0 right-0 bottom-0 z-[60] mx-auto w-full max-w-[430px] rounded-t-3xl border p-5"
          style={{ background: '#232426', borderColor: '#2f3032' }}
        >
          <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-white/50" />
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="mt-0.5 inline-flex size-7 items-center justify-center rounded-full border" style={{ borderColor: T.border, color: T.inkMuted }}>
                <ShoppingCart size={16} />
              </div>
              <div className="min-w-0">
                <h3 className="text-[18px] leading-6 truncate" style={{ color: T.ink, fontFamily: T.display }}>
                  {selected.merchantName}
                </h3>
                <p className="text-[14px]" style={{ color: T.inkMuted }}>
                  {selectedCategory?.name ?? transactionTypeLabel(selected.type)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="size-8 inline-flex items-center justify-center shrink-0"
              style={{ color: T.ink }}
            >
              <X size={24} />
            </button>
          </div>

          <DetailRow label="Amount" value={`${(Math.abs(selected.amount) / 100).toFixed(2)}€`} />
          <DetailRow label="Date" value={formatFullDate(selected.occurredAt)} />
          <div className="pt-4 flex items-center justify-between">
            <p className="text-[16px]" style={{ color: T.inkMuted }}>
              Category
            </p>
            {selectedCategory ? (
              <div
                className="inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1"
                style={{ borderColor: T.border, color: T.ink }}
              >
                <span aria-hidden className="text-[12px]">
                  {categoryGlyph(selectedCategory.name)}
                </span>
                <span className="text-[13px] leading-4">{selectedCategory.name}</span>
              </div>
            ) : (
              <span className="text-[14px]" style={{ color: T.ink }}>
                -
              </span>
            )}
          </div>
        </section>
      )}
    </>
  )
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border px-4 h-11 text-[14px]"
      style={{
        borderColor: active ? 'var(--color-brand)' : 'var(--color-card-border)',
        background: active ? 'var(--color-brand)' : 'transparent',
        color: active ? '#111' : 'var(--color-ink)',
        fontWeight: active ? 600 : 500,
      }}
    >
      {children}
    </button>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-card-border)' }}>
      <p className="text-[16px]" style={{ color: 'var(--color-ink-muted)' }}>
        {label}
      </p>
      <p className="text-[18px]" style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
        {value}
      </p>
    </div>
  )
}
