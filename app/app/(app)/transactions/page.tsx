import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Filter, Search } from 'lucide-react'
import { getTransactionsData } from '@/lib/finance-data'
import { PageHeader } from '@/components/page-header'

const T = {
  brand: 'var(--color-brand)',
  card: 'var(--color-card)',
  border: 'var(--color-card-border)',
  divider: 'var(--color-divider)',
  ink: 'var(--color-ink)',
  inkMuted: 'var(--color-ink-muted)',
  display: 'var(--font-display)',
} as const

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

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams?: { q?: string }
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')
  if (!token) redirect('/login')

  const q = searchParams?.q?.trim() ?? ''
  const data = await getTransactionsData(token.value, { search: q || undefined })

  const grouped = data.items.reduce(
    (acc, item) => {
      const key = item.occurredAt
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    },
    {} as Record<string, typeof data.items>,
  )
  const dates = Object.keys(grouped)

  return (
    <div className="mx-auto w-full max-w-[430px] px-4 py-6 flex flex-col gap-6">
      <PageHeader title="Transactions" description="View and manage your transaction history" />

      <form method="GET" className="flex items-center gap-3">
        <div
          className="flex-1 h-12 rounded-2xl border px-4 flex items-center gap-3"
          style={{ background: '#111', borderColor: T.border }}
        >
          <Search size={22} style={{ color: T.ink }} />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search..."
            className="w-full bg-transparent outline-none text-[32px]"
            style={{ color: T.ink, fontFamily: T.display, fontSize: 34, lineHeight: '40px' }}
            aria-label="Search transactions"
          />
        </div>
        <button
          type="button"
          aria-label="Filter transactions"
          className="size-12 rounded-2xl inline-flex items-center justify-center"
          style={{ background: T.brand, color: '#111' }}
        >
          <Filter size={24} />
        </button>
      </form>

      <div className="h-px w-full" style={{ background: T.divider }} />

      <section className="flex flex-col gap-8 pb-2">
        {dates.map(date => {
          const items = grouped[date]
          const total = items.reduce((sum, item) => sum + item.amount, 0)
          return (
            <div key={date} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2
                  className="text-[36px] leading-[40px]"
                  style={{ color: T.ink, fontFamily: T.display, fontWeight: 500 }}
                >
                  {formatDateHeader(date)}
                </h2>
                <p
                  className="text-[36px] leading-[40px]"
                  style={{ color: T.ink, fontFamily: T.display, fontWeight: 600 }}
                >
                  {formatAmount(total)}
                </p>
              </div>

              {items.map(item => {
                const category = item.categoryId ? data.categories.get(item.categoryId) : null
                return (
                  <article
                    key={item.id}
                    className="rounded-3xl border px-4 py-3 flex flex-col gap-2"
                    style={{ background: T.card, borderColor: T.border }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className="text-[38px] leading-[40px] truncate"
                          style={{ color: T.ink, fontFamily: T.display, fontWeight: 500 }}
                        >
                          {item.merchantName}
                        </p>
                        <p className="text-[22px] leading-6" style={{ color: T.inkMuted }}>
                          {item.bank}
                        </p>
                      </div>
                      <p
                        className="text-[40px] leading-[40px] shrink-0"
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
                        className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 self-start"
                        style={{ borderColor: T.border, color: T.ink }}
                      >
                        <span aria-hidden>{categoryGlyph(category.name)}</span>
                        <span className="text-[22px] leading-6">{category.name}</span>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )
        })}
      </section>
    </div>
  )
}
