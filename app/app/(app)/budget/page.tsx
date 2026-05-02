import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Icon } from '@iconify/react'
import { PageHeader } from '@/components/page-header'
import {
  getDashboardData,
  currentMonth,
  type DashboardData,
} from '@/lib/finance-data'

const T = {
  brand: 'var(--color-brand)',
  brandBright: 'var(--color-brand-bright)',
  card: 'var(--color-card)',
  border: 'var(--color-card-border)',
  divider: 'var(--color-divider)',
  ink: 'var(--color-ink)',
  inkMuted: 'var(--color-ink-muted)',
  inkFaint: 'var(--color-ink-faint)',
  pink: 'var(--color-icon-pink)',
  display: 'var(--font-display)',
} as const

const cardStyle: React.CSSProperties = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 16,
}

function lastNMonths(n: number, from: string = currentMonth()): string[] {
  const [y, m] = from.split('-').map(Number)
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date(y, m - 1 - i, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

function monthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('default', {
    month: 'short',
    year: 'numeric',
  })
}

export default async function BudgetPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')
  if (!token) redirect('/login')

  const months = lastNMonths(3)

  let snapshots: DashboardData[]
  try {
    snapshots = await Promise.all(
      months.map(m => getDashboardData(token.value, m)),
    )
  } catch (err) {
    return (
      <div className="mx-auto w-full max-w-[430px] flex flex-col gap-3 p-4">
        <h1
          className="text-[24px] leading-none"
          style={{ color: T.ink, fontFamily: T.display, fontWeight: 500 }}
        >
          Budget
        </h1>
        <p className="text-[14px]" style={{ color: T.inkMuted }}>
          Could not load data: {err instanceof Error ? err.message : String(err)}
        </p>
      </div>
    )
  }

  // Build per-category averages across the snapshots. Use the most recent
  // snapshot as the source of truth for budget + icon.
  const ref = snapshots[0]
  const totalBudget = ref.totalBudget

  const sumByCategory: Record<string, number> = {}
  for (const snap of snapshots) {
    for (const c of snap.categories) {
      sumByCategory[c.name] = (sumByCategory[c.name] ?? 0) + c.spent
    }
  }
  const avgByCategory: Record<string, number> = Object.fromEntries(
    Object.entries(sumByCategory).map(([k, v]) =>
      [k, Math.round(v / snapshots.length)],
    ),
  )

  const totalAvgSpend = Math.round(
    snapshots.reduce((s, snap) => s + snap.totalSpent, 0) / snapshots.length,
  )

  const headroomPct =
    totalAvgSpend > 0
      ? Math.round(((totalBudget - totalAvgSpend) / totalAvgSpend) * 100)
      : 0

  const totalCatBudget = ref.categories.reduce((s, c) => s + c.budget, 0)

  return (
    <div className="mx-auto w-full max-w-[430px] flex flex-col gap-6 p-4">
      {/* ── Header ── */}
      <PageHeader
        title="Budget"
        backHref="/"
        description={
          <>
            Sized at{' '}
            <span style={{ color: T.ink, fontWeight: 600 }}>{headroomPct}%</span>{' '}
            above your average monthly spend of{' '}
            <span style={{ color: T.ink, fontWeight: 600 }}>
              {totalAvgSpend.toLocaleString()}€
            </span>
            , then split across the four categories below.
          </>
        }
      />

      {/* ── Total target ── */}
      <section style={cardStyle} className="p-5 flex flex-col gap-3">
        <p className="text-[14px]" style={{ color: T.inkMuted }}>
          Monthly target
        </p>
        <div className="flex items-end gap-2">
          <span
            className="text-[36px] leading-[40px]"
            style={{ color: T.ink, fontFamily: T.display, fontWeight: 600 }}
          >
            {totalBudget.toLocaleString()}€
          </span>
          <span
            className="text-[14px] leading-7"
            style={{ color: T.inkMuted }}
          >
            avg {totalAvgSpend.toLocaleString()}€
          </span>
        </div>

        {/* Avg-spend bar inside the target */}
        <div className="flex flex-col gap-1.5 mt-1">
          <div
            className="w-full overflow-hidden"
            style={{ height: 6, background: T.border, borderRadius: 9999 }}
          >
            <div
              className="h-full"
              style={{
                width: `${Math.min((totalAvgSpend / totalBudget) * 100, 100)}%`,
                background: T.brand,
                borderRadius: 9999,
              }}
            />
          </div>
          <div
            className="flex justify-between text-[11px]"
            style={{ color: T.inkFaint }}
          >
            <span>avg spend</span>
            <span>target</span>
          </div>
        </div>
      </section>

      {/* ── Per-category breakdown ── */}
      <section style={cardStyle} className="py-5 flex flex-col gap-4">
        <h2
          className="text-[18px] px-5"
          style={{ color: T.ink, fontWeight: 500 }}
        >
          By category
        </h2>

        <div className="flex flex-col gap-5 px-5">
          {ref.categories.map(cat => {
            const avg = avgByCategory[cat.name] ?? 0
            const pct =
              cat.budget > 0 ? Math.min((avg / cat.budget) * 100, 100) : 0
            return (
              <div key={cat.name} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="size-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: T.pink }}
                    >
                      <Icon
                        icon={cat.icon}
                        width={22}
                        height={22}
                        style={{ color: T.card, display: 'block' }}
                      />
                    </div>
                    <p
                      className="text-[16px] tracking-[-0.3px]"
                      style={{ color: T.ink, fontWeight: 500 }}
                    >
                      {cat.name}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <p
                      className="text-[16px]"
                      style={{
                        color: T.ink,
                        fontFamily: T.display,
                        fontWeight: 600,
                      }}
                    >
                      {cat.budget.toLocaleString()}€
                    </p>
                    <p className="text-[12px]" style={{ color: T.inkMuted }}>
                      avg {avg.toLocaleString()}€
                    </p>
                  </div>
                </div>
                <div
                  className="w-full overflow-hidden"
                  style={{
                    height: 4,
                    background: T.border,
                    borderRadius: 9999,
                  }}
                >
                  <div
                    className="h-full"
                    style={{
                      width: `${pct}%`,
                      background: T.brand,
                      borderRadius: 9999,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="px-4">
          <div className="h-px w-full" style={{ background: T.divider }} />
        </div>

        <div className="flex items-center justify-between px-5">
          <span
            className="text-[16px] tracking-[-0.3px]"
            style={{ color: T.inkMuted }}
          >
            Sum of category targets
          </span>
          <span
            className="text-[18px]"
            style={{ color: T.ink, fontFamily: T.display, fontWeight: 600 }}
          >
            {totalCatBudget.toLocaleString()}€
          </span>
        </div>
      </section>

      <p className="text-[12px]" style={{ color: T.inkFaint }}>
        Averages computed across {months.map(monthLabel).join(', ')}.
      </p>
    </div>
  )
}
