import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Check, ChevronRight, Info } from 'lucide-react'
import { Icon } from '@iconify/react'
import { getDashboardData, type DashboardData, type WeekBucket } from '@/lib/finance-data'
import { PageHeader } from '@/components/page-header'

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
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  pink: 'var(--color-icon-pink)',
  display: 'var(--font-display)',
  text: 'var(--font-text)',
} as const

const cardStyle: React.CSSProperties = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 16,
}

// ─── Animation helpers ──────────────────────────────────────────────────────

const EASE = 'cubic-bezier(0.2, 0.7, 0.2, 1)'

function fadeIn(delayMs: number, durationMs = 500): React.CSSProperties {
  return { animation: `mr-fade-in-up ${durationMs}ms ${delayMs}ms ${EASE} both` }
}

function barGrowH(delayMs: number, durationMs = 800): React.CSSProperties {
  return {
    transformOrigin: 'left center',
    animation: `mr-bar-grow-h ${durationMs}ms ${delayMs}ms ${EASE} both`,
  }
}

function barGrowV(delayMs: number, durationMs = 700): React.CSSProperties {
  return {
    transformOrigin: 'bottom',
    animation: `mr-bar-grow-v ${durationMs}ms ${delayMs}ms ${EASE} both`,
  }
}

// ─── Weekly bar chart ────────────────────────────────────────────────────────

const CHART_H = 188 // bar area
const Y_AXIS_W = 36

// Chart max is ~20% above the largest week, then rounded up to a nice step
// so the tallest bar never touches the top of the plot area.
const CHART_HEADROOM = 1.2

function niceMax(values: number[]): number {
  const peak = Math.max(...values, 1)
  const raw = peak * CHART_HEADROOM
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = magnitude / 10
  return Math.ceil(raw / step) * step
}

// Spent/budget ratio → semantic color. <75% safe, 75-100% warning, >100% over.
function budgetColor(spent: number, budget: number): string {
  if (budget <= 0) return T.brand
  const ratio = spent / budget
  if (ratio > 1) return T.danger
  if (ratio >= 0.75) return T.warning
  return T.success
}

function WeeklyChart({
  data,
  title = '4-Week Spending Trend',
  barBaseDelayMs = 0,
}: {
  data: WeekBucket[]
  title?: string
  barBaseDelayMs?: number
}) {
  const values = data.map(w => w.spent)
  const chartMax = niceMax(values)
  const yLabels = [chartMax, (chartMax * 3) / 4, chartMax / 2, chartMax / 4, 0].map(Math.round)

  return (
    <div className="w-full">
      <p
        className="text-[16px] mb-4"
        style={{ color: T.inkMuted }}
      >
        {title}
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
          <div className="absolute inset-0 flex items-end gap-3">
            {data.map((w, i) => {
              const h = Math.max((w.spent / chartMax) * CHART_H, 4)
              return (
                <div key={i} className="flex flex-1 flex-col items-center">
                  <span
                    className="text-[14px] font-bold whitespace-nowrap"
                    style={{
                      color: '#fff',
                      fontFamily: T.text,
                      fontWeight: 600,
                      ...fadeIn(barBaseDelayMs + i * 80 + 200, 400),
                    }}
                  >
                    {w.spent.toLocaleString()}€
                  </span>
                  <div
                    className="w-full rounded-t-[8px]"
                    style={{
                      height: h,
                      background: T.brand,
                      ...barGrowV(barBaseDelayMs + i * 80),
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex" style={{ paddingLeft: Y_AXIS_W }}>
        {data.map((w, i) => (
          <div
            key={i}
            className="flex-1 text-center text-[12px] pt-2"
            style={{ color: T.inkFaint }}
          >
            {w.label}
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
        style={{ color: T.ink, fontWeight: 500 }}
      >
        {title}
      </h2>
      <button
        className="flex items-center gap-1 text-[14px] py-2 px-2 rounded-lg"
        style={{ color: T.brand, fontWeight: 500 }}
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
  if (!token) redirect('/login')

  let data: DashboardData
  try {
    data = await getDashboardData(token.value)
  } catch (err) {
    return (
      <div className="mx-auto w-full max-w-[430px] flex flex-col gap-3 p-4">
        <h1
          className="text-[24px] leading-none"
          style={{ color: T.ink, fontFamily: T.display, fontWeight: 500 }}
        >
          Dashboard
        </h1>
        <p className="text-[14px]" style={{ color: T.inkMuted }}>
          Could not load data: {err instanceof Error ? err.message : String(err)}
        </p>
      </div>
    )
  }

  const spentPct = data.totalBudget > 0
    ? Math.min((data.totalSpent / data.totalBudget) * 100, 100)
    : 0
  const underBudget = data.totalBudget - data.totalSpent

  return (
    <div className="mx-auto w-full max-w-[430px] flex flex-col gap-6 p-4">
      {/* ── Title ── */}
      <div style={fadeIn(0, 450)}>
        <PageHeader
          title="Dashboard"
          description="Track your spending and financial insights"
        />
      </div>

      {/* ── This Month ── */}
      <section style={{ ...cardStyle, ...fadeIn(80) }} className="p-5 flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <p className="text-[18px]" style={{ color: T.ink }}>
              This Month
            </p>
            <p className="text-[14px] leading-5" style={{ color: T.brand }}>
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
              className="text-[18px] leading-7 inline-flex items-center gap-1"
              style={{ color: T.inkMuted }}
            >
              of {data.totalBudget.toLocaleString()}€
              <Link
                href="/budget"
                aria-label="How was this budget set?"
                className="size-5 inline-flex items-center justify-center rounded-full transition-opacity hover:opacity-100"
                style={{ color: T.inkMuted, opacity: 0.6 }}
              >
                <Info size={14} strokeWidth={2.25} />
              </Link>
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
                background: budgetColor(data.totalSpent, data.totalBudget),
                borderRadius: 9999,
                ...barGrowH(450, 900),
              }}
            />
          </div>

          {underBudget > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <p className="text-[14px]" style={{ color: T.success }}>
                {underBudget.toLocaleString()}€ under budget
              </p>
              <Check size={14} strokeWidth={2.5} style={{ color: T.success }} />
            </div>
          )}
        </div>
      </section>

      {/* ── 4-Week Spending Trend ── */}
      <section style={{ ...cardStyle, ...fadeIn(130) }} className="p-5">
        <WeeklyChart
          data={data.weeklySpending}
          title="4-Week Spending Trend"
          barBaseDelayMs={500}
        />
      </section>

      {/* ── Category ── */}
      <section style={{ ...cardStyle, ...fadeIn(180) }} className="py-5 flex flex-col gap-6">
        <SectionHeader title="Category" action="See all transactions" />

        <div className="flex flex-col gap-4 px-5">
          {data.categories.map((cat, i) => {
            const pct = Math.min((cat.spent / cat.budget) * 100, 100)
            return (
              <div key={cat.name} className="flex flex-col gap-3">
                <div className="flex items-center justify-between h-10">
                  <div className="flex items-center gap-3">
                    <div
                      className="size-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: T.pink }}
                    >
                      <Icon
                        icon={cat.icon}
                        width={22}
                        height={22}
                        style={{ color: T.card, display: 'block', flexShrink: 0 }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <p
                        className="text-[16px] tracking-[-0.3px]"
                        style={{ color: T.ink, fontWeight: 500 }}
                      >
                        {cat.name}
                      </p>
                      <p className="text-[12px]" style={{ color: T.inkMuted }}>
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
                    <p className="text-[12px]" style={{ color: T.inkMuted }}>
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
                      background: budgetColor(cat.spent, cat.budget),
                      borderRadius: 9999,
                      ...barGrowH(600 + i * 90, 850),
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Subscriptions ── */}
      <section
        style={{ ...cardStyle, ...fadeIn(280) }}
        className="py-5 flex flex-col gap-6"
      >
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
                      style={{ color: T.ink, fontWeight: 500 }}
                    >
                      {sub.name}
                    </p>
                    <p className="text-[12px]" style={{ color: T.inkMuted }}>
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
              style={{ color: T.inkMuted }}
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
