import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Check, ChevronRight } from 'lucide-react'
import { getDashboardData } from '@/lib/finance-data'

// ─── Tokens (mirror globals.css) ─────────────────────────────────────────────

const T = {
  brand: 'var(--color-brand)',
  brandBright: 'var(--color-brand-bright)',
  card: 'var(--color-card)',
  border: 'var(--color-card-border)',
  divider: 'var(--color-divider)',
  ink: 'var(--color-ink)',
  inkMuted: 'var(--color-ink-muted)',
  inkFaint: 'var(--color-ink-faint)',
  success: 'var(--color-success)',
  pink: 'var(--color-icon-pink)',
  display: 'var(--font-display)',
  text: 'var(--font-text)',
} as const

const cardStyle: React.CSSProperties = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 16,
}

// ─── Weekly bar chart ────────────────────────────────────────────────────────

const CHART_H = 188 // bar area
const Y_AXIS_W = 36

function niceMax(values: number[]): number {
  const raw = Math.max(...values, 1)
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)))
  const ratio = raw / magnitude
  const step = magnitude * (ratio <= 2 ? 0.5 : ratio <= 5 ? 1 : 2)
  return Math.ceil(raw / step) * step
}

function WeeklyChart({ data }: { data: number[] }) {
  const chartMax = niceMax(data)
  const yLabels = [chartMax, (chartMax * 3) / 4, chartMax / 2, chartMax / 4, 0].map(Math.round)

  return (
    <div className="w-full">
      <p
        className="text-[16px] mb-4"
        style={{ color: T.inkMuted, fontFamily: T.display }}
      >
        Weekly Spending
      </p>

      <div className="flex">
        {/* Y-axis labels */}
        <div className="relative shrink-0" style={{ width: Y_AXIS_W, height: CHART_H }}>
          {yLabels.map(val => (
            <span
              key={val}
              className="absolute right-2 leading-none text-[12px]"
              style={{
                top: `${((chartMax - val) / chartMax) * CHART_H}px`,
                transform: 'translateY(-50%)',
                color: T.inkFaint,
              }}
            >
              {val}
            </span>
          ))}
        </div>

        {/* Plot area */}
        <div className="relative flex-1" style={{ height: CHART_H }}>
          {/* Dashed gridlines */}
          {yLabels.map(val => (
            <div
              key={val}
              className="absolute left-0 right-0"
              style={{
                top: `${((chartMax - val) / chartMax) * CHART_H}px`,
                borderTop: `1px dashed ${T.border}`,
              }}
            />
          ))}

          {/* Bars */}
          <div className="absolute inset-0 flex items-end justify-around px-1">
            {data.map((val, i) => {
              const h = Math.max((val / chartMax) * CHART_H, 4)
              return (
                <div key={i} className="flex flex-col items-center" style={{ width: 36 }}>
                  <span
                    className="text-[12px] mb-1 whitespace-nowrap"
                    style={{
                      color: T.ink,
                      fontFamily: T.display,
                      fontWeight: 600,
                    }}
                  >
                    {val.toLocaleString()}€
                  </span>
                  <div
                    className="w-full rounded-t-[2px]"
                    style={{ height: h, background: T.brand }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex" style={{ paddingLeft: Y_AXIS_W }}>
        {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map(w => (
          <div
            key={w}
            className="flex-1 text-center text-[12px] pt-2"
            style={{ color: T.inkFaint }}
          >
            {w}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Section header used by Category & Subscriptions cards ───────────────────

function SectionHeader({ title, action }: { title: string; action: string }) {
  return (
    <div className="flex items-center justify-between pl-5 pr-3">
      <h2
        className="text-[18px] tracking-[-0.4px]"
        style={{ color: T.ink, fontFamily: T.display, fontWeight: 600 }}
      >
        {title}
      </h2>
      <button
        className="flex items-center gap-1 text-[14px] py-2 px-2 rounded-lg"
        style={{ color: T.brand, fontFamily: T.text, fontWeight: 500 }}
      >
        {action}
        <ChevronRight size={14} strokeWidth={2.5} />
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')
  if (!token && process.env.NODE_ENV !== 'development') redirect('/login')

  const data = getDashboardData()
  const spentPct = Math.min((data.totalSpent / data.totalBudget) * 100, 100)
  const underBudget = data.totalBudget - data.totalSpent

  return (
    <div className="mx-auto w-full max-w-[430px] flex flex-col gap-6 p-4">
      {/* ── Title ── */}
      <div className="flex flex-col gap-2">
        <h1
          className="text-[24px] leading-none"
          style={{ color: T.ink, fontFamily: T.display, fontWeight: 500 }}
        >
          Dashboard
        </h1>
        <p
          className="text-[16px] tracking-[-0.3px]"
          style={{ color: '#a3a3a3', fontFamily: T.display }}
        >
          Track your spending and financial insights
        </p>
      </div>

      {/* ── Monthly Spending ── */}
      <section style={cardStyle} className="p-5 flex flex-col gap-10">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <p className="text-[16px]" style={{ color: T.inkMuted, fontFamily: T.display }}>
              Monthly Spending
            </p>
            <p
              className="text-[14px] leading-5"
              style={{ color: T.brand, fontFamily: T.display }}
            >
              {data.monthLabel}
            </p>
          </div>

          <div className="flex items-end gap-1">
            <span
              className="text-[36px] leading-[40px]"
              style={{ color: T.ink, fontFamily: T.display, fontWeight: 600 }}
            >
              {data.totalSpent.toLocaleString()}€
            </span>
            <span
              className="text-[18px] leading-7"
              style={{ color: T.inkMuted, fontFamily: T.display }}
            >
              of {data.totalBudget.toLocaleString()}€
            </span>
          </div>

          {/* Progress bar */}
          <div
            className="w-full overflow-hidden mt-1"
            style={{ height: 4, background: T.border, borderRadius: 9999 }}
          >
            <div
              className="h-full"
              style={{
                width: `${spentPct}%`,
                background: T.brandBright,
                borderRadius: 9999,
              }}
            />
          </div>

          {underBudget > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <p className="text-[14px]" style={{ color: T.success, fontFamily: T.display }}>
                {underBudget.toLocaleString()}€ under budget
              </p>
              <Check size={14} strokeWidth={2.5} style={{ color: T.success }} />
            </div>
          )}
        </div>

        <WeeklyChart data={data.weeklySpending} />
      </section>

      {/* ── Category ── */}
      <section style={cardStyle} className="py-5 flex flex-col gap-6">
        <SectionHeader title="Category" action="See all transactions" />

        <div className="flex flex-col gap-4 px-5">
          {data.categories.map(cat => {
            const pct = Math.min((cat.spent / cat.budget) * 100, 100)
            return (
              <div key={cat.name} className="flex flex-col gap-3">
                <div className="flex items-center justify-between h-10">
                  <div className="flex items-center gap-3">
                    <div
                      className="size-10 rounded-full flex items-center justify-center text-[18px] shrink-0"
                      style={{ background: T.pink }}
                    >
                      {cat.icon}
                    </div>
                    <div className="flex flex-col gap-1">
                      <p
                        className="text-[16px] tracking-[-0.3px]"
                        style={{ color: T.ink, fontFamily: T.display, fontWeight: 500 }}
                      >
                        {cat.name}
                      </p>
                      <p
                        className="text-[12px]"
                        style={{ color: T.inkMuted, fontFamily: T.display }}
                      >
                        {cat.transactionCount} transaction
                        {cat.transactionCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-0.5">
                    <p
                      className="text-[16px]"
                      style={{ color: T.ink, fontFamily: T.display, fontWeight: 600 }}
                    >
                      {cat.spent.toLocaleString()}€
                    </p>
                    <p
                      className="text-[12px]"
                      style={{ color: T.inkMuted, fontFamily: T.display }}
                    >
                      of {cat.budget.toLocaleString()}€
                    </p>
                  </div>
                </div>

                <div
                  className="w-full overflow-hidden"
                  style={{ height: 4, background: T.border, borderRadius: 9999 }}
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
      </section>

      {/* ── Subscriptions ── */}
      <section style={cardStyle} className="py-5 flex flex-col gap-6">
        <SectionHeader title="Subscriptions" action="Manage" />

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 px-5">
            {data.subscriptions.map(sub => (
              <div key={sub.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="size-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: '#000' }}
                  >
                    <span
                      className="text-[18px] leading-none"
                      style={{ color: sub.color, fontFamily: T.display, fontWeight: 700 }}
                    >
                      {sub.initials}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p
                      className="text-[16px] tracking-[-0.3px]"
                      style={{ color: T.ink, fontFamily: T.display, fontWeight: 500 }}
                    >
                      {sub.name}
                    </p>
                    <p
                      className="text-[12px]"
                      style={{ color: T.inkMuted, fontFamily: T.display }}
                    >
                      {sub.cycle}
                    </p>
                  </div>
                </div>
                <p
                  className="text-[16px]"
                  style={{ color: T.ink, fontFamily: T.display, fontWeight: 600 }}
                >
                  {sub.amount.toFixed(2)}€
                </p>
              </div>
            ))}
          </div>

          <div className="px-4">
            <div className="h-px w-full" style={{ background: T.divider }} />
          </div>

          <div className="flex items-center justify-between px-5">
            <span
              className="text-[16px] tracking-[-0.3px]"
              style={{ color: T.inkMuted, fontFamily: T.display }}
            >
              Total Monthly
            </span>
            <span
              className="text-[18px]"
              style={{ color: T.ink, fontFamily: T.display, fontWeight: 600 }}
            >
              {data.subscriptionTotal.toFixed(2)}€
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
