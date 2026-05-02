import { Sun, Bell } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { getDashboardData } from '@/lib/finance-data'

// ─── Weekly bar chart ────────────────────────────────────────────────────────

const CHART_H = 160 // px

function niceMax(values: number[]): number {
  const raw = Math.max(...values, 1)
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = magnitude * (raw / magnitude <= 2 ? 0.5 : raw / magnitude <= 5 ? 1 : 2)
  return Math.ceil(raw / step) * step
}

function WeeklyChart({ data }: { data: number[] }) {
  const chartMax = niceMax(data)
  const step = chartMax / 4
  const yLabels = [chartMax, chartMax * 0.75, chartMax * 0.5, chartMax * 0.25, 0].map(Math.round)

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-3">Weekly Spending</p>

      <div className="flex">
        {/* Y-axis */}
        <div className="relative flex-shrink-0" style={{ width: 48, height: CHART_H }}>
          {yLabels.map(val => (
            <span
              key={val}
              className="absolute right-2 leading-none text-muted-foreground"
              style={{
                top: `${((chartMax - val) / chartMax) * CHART_H}px`,
                transform: 'translateY(-50%)',
                fontSize: 10,
              }}
            >
              {val >= 1000 ? `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k` : val}
            </span>
          ))}
        </div>

        {/* Chart area */}
        <div className="relative flex-1" style={{ height: CHART_H }}>
          {/* Grid lines */}
          {yLabels.map(val => (
            <div
              key={val}
              className="absolute left-0 right-0"
              style={{
                top: `${((chartMax - val) / chartMax) * CHART_H}px`,
                borderTop: '1px dashed oklch(0.35 0 0)',
              }}
            />
          ))}

          {/* Bars */}
          <div className="absolute inset-0 flex items-end gap-1.5 px-1">
            {data.map((val, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col items-center justify-end"
                style={{ height: '100%' }}
              >
                <span className="font-semibold text-foreground mb-1" style={{ fontSize: 11 }}>
                  {val.toLocaleString()}€
                </span>
                <div
                  className="w-full rounded-t-sm"
                  style={{
                    height: `${Math.max((val / chartMax) * 100, 2)}%`,
                    background: 'var(--color-brand)',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex" style={{ paddingLeft: 48 }}>
        {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map(w => (
          <div
            key={w}
            className="flex-1 text-center text-muted-foreground"
            style={{ fontSize: 11, paddingTop: 6 }}
          >
            {w}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Dashboard page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const data = getDashboardData()
  const spentPct = Math.min((data.totalSpent / data.totalBudget) * 100, 100)
  const underBudget = data.totalBudget - data.totalSpent

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[430px] pb-10">

        {/* ── Top nav ── */}
        <nav className="flex items-center justify-between px-4 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: 'var(--color-brand)' }}
            >
              🦆
            </div>
            <span className="font-bold text-lg text-foreground">Mr Ducky</span>
          </div>
          <div className="flex items-center gap-3.5">
            <Sun className="w-5 h-5 text-muted-foreground" />
            <div className="relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full" />
            </div>
          </div>
        </nav>

        {/* ── Header ── */}
        <div className="px-4 mb-5">
          <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your spending and financial insights
          </p>
        </div>

        {/* ── Monthly spending card ── */}
        <Card className="mx-4 mb-4 rounded-2xl border-0">
          <CardContent className="p-4 pt-4">
            <p className="text-sm text-muted-foreground">Monthly Spending</p>
            <p className="text-sm font-medium" style={{ color: 'var(--color-brand)' }}>
              {data.monthLabel}
            </p>

            <div className="mt-3 mb-2 flex items-baseline gap-2">
              <span className="text-5xl font-bold text-foreground">
                {data.totalSpent.toLocaleString()}€
              </span>
              <span className="text-base text-muted-foreground">
                of {data.totalBudget.toLocaleString()}€
              </span>
            </div>

            {/* Progress bar */}
            <div
              className="h-2 w-full rounded-full mb-2"
              style={{ background: 'oklch(0.269 0 0)' }}
            >
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${spentPct}%`, background: 'var(--color-brand)' }}
              />
            </div>

            {underBudget > 0 && (
              <p className="text-sm mb-4" style={{ color: 'oklch(0.723 0.191 149.579)' }}>
                {underBudget.toLocaleString()}€ under budget ✓
              </p>
            )}

            <WeeklyChart data={data.weeklySpending} />
          </CardContent>
        </Card>

        {/* ── Category card ── */}
        <Card className="mx-4 mb-4 rounded-2xl border-0">
          <CardHeader className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-foreground">Category</CardTitle>
              <button
                className="text-sm font-medium"
                style={{ color: 'var(--color-brand)' }}
              >
                See all transactions →
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {data.categories.map(cat => {
              const pct = Math.min((cat.spent / cat.budget) * 100, 100)
              return (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: 'oklch(0.88 0.06 60)' }}
                      >
                        {cat.icon}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {cat.transactionCount} transaction{cat.transactionCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">{cat.spent.toLocaleString()}€</p>
                      <p className="text-xs text-muted-foreground">of {cat.budget.toLocaleString()}€</p>
                    </div>
                  </div>
                  <div
                    className="h-1.5 w-full rounded-full"
                    style={{ background: 'oklch(0.269 0 0)' }}
                  >
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${pct}%`, background: 'var(--color-brand)' }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* ── Subscriptions card ── */}
        <Card className="mx-4 rounded-2xl border-0">
          <CardHeader className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-foreground">Subscriptions</CardTitle>
              <button
                className="text-sm font-medium"
                style={{ color: 'var(--color-brand)' }}
              >
                Manage →
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {data.subscriptions.map(sub => (
              <div key={sub.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: sub.color }}
                  >
                    {sub.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{sub.name}</p>
                    <p className="text-xs text-muted-foreground">{sub.cycle}</p>
                  </div>
                </div>
                <p className="font-bold text-foreground">{sub.amount.toFixed(2)}€</p>
              </div>
            ))}

            <Separator style={{ background: 'oklch(0.269 0 0)' }} />

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Monthly</span>
              <span className="font-bold text-foreground">{data.subscriptionTotal.toFixed(2)}€</span>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
