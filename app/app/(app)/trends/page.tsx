import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { CSSProperties } from 'react'

import { PageHeader } from '@/components/page-header'
import { getDashboardData } from '@/lib/finance-data'
import { getTrendsData, type TrendPoint } from '@/lib/trends-data'

const T = {
  brand: 'var(--color-brand)',
  card: 'var(--color-card)',
  border: 'var(--color-card-border)',
  divider: 'var(--color-divider)',
  ink: 'var(--color-ink)',
  inkMuted: 'var(--color-ink-muted)',
  inkFaint: 'var(--color-ink-faint)',
  display: 'var(--font-display)',
} as const

const cardStyle: CSSProperties = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 16,
}

function niceMax(values: number[]): number {
  const peak = Math.max(...values, 1)
  const magnitude = Math.pow(10, Math.floor(Math.log10(peak)))
  const step = magnitude / 2
  return Math.ceil((peak * 1.15) / step) * step
}

function WeeklyBars({ data }: { data: { label: string; spent: number }[] }) {
  const chartMax = niceMax(data.map(d => d.spent))
  return (
    <div className="flex items-end gap-3 h-[210px]">
      {data.map(item => {
        const height = Math.max((item.spent / chartMax) * 160, 5)
        return (
          <div key={item.label} className="flex flex-1 flex-col items-center justify-end gap-2">
            <span className="text-[12px]" style={{ color: T.inkMuted }}>
              {Math.round(item.spent).toLocaleString()}€
            </span>
            <div
              className="w-full rounded-t-[8px]"
              style={{
                height,
                background: T.brand,
              }}
            />
            <span className="text-[12px]" style={{ color: T.inkFaint }}>
              {item.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function buildPath(
  values: number[],
  width: number,
  height: number,
  maxValue: number,
  paddingX: number,
  paddingY: number,
): string {
  const drawableW = width - paddingX * 2
  const drawableH = height - paddingY * 2
  return values
    .map((value, idx) => {
      const x = paddingX + (idx / Math.max(values.length - 1, 1)) * drawableW
      const y = paddingY + (1 - value / Math.max(maxValue, 1)) * drawableH
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')
}

function buildAreaPath(
  values: number[],
  width: number,
  height: number,
  maxValue: number,
  paddingX: number,
  paddingY: number,
): string {
  const linePath = buildPath(values, width, height, maxValue, paddingX, paddingY)
  const drawableW = width - paddingX * 2
  const baselineY = height - paddingY
  const firstX = paddingX
  const lastX = paddingX + drawableW
  return `${linePath} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`
}

function MonthlyTrendChart({ points }: { points: TrendPoint[] }) {
  const width = 760
  const height = 280
  const paddingX = 20
  const paddingY = 16
  const maxY = niceMax(
    points.flatMap(p => [p.currentMonthProjected, p.lastMonth, p.averageLastThreeMonths]),
  )

  const currentLine = points.map(p => p.currentMonthProjected)
  const lastMonthLine = points.map(p => p.lastMonth)
  const avgLine = points.map(p => p.averageLastThreeMonths)

  const yTicks = [1, 0.75, 0.5, 0.25, 0].map(r => Math.round(maxY * r))
  const xTickIndexes = [0, 7, 14, 21, points.length - 1].filter(i => i < points.length)

  return (
    <div className="w-full flex flex-col gap-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {yTicks.map(v => {
          const y = paddingY + (1 - v / Math.max(maxY, 1)) * (height - paddingY * 2)
          return (
            <g key={v}>
              <line
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke={T.divider}
                strokeDasharray="4 4"
              />
              <text x={paddingX + 2} y={y - 4} fill={T.inkFaint} fontSize="11">
                {v.toLocaleString()}€
              </text>
            </g>
          )
        })}

        <path
          d={buildAreaPath(currentLine, width, height, maxY, paddingX, paddingY)}
          fill="color-mix(in srgb, var(--color-brand) 18%, transparent)"
        />

        <path
          d={buildPath(currentLine, width, height, maxY, paddingX, paddingY)}
          fill="none"
          stroke={T.brand}
          strokeWidth="3"
        />
        <path
          d={buildPath(lastMonthLine, width, height, maxY, paddingX, paddingY)}
          fill="none"
          stroke="var(--color-ink-muted)"
          strokeWidth="2"
        />
        <path
          d={buildPath(avgLine, width, height, maxY, paddingX, paddingY)}
          fill="none"
          stroke="var(--color-success)"
          strokeWidth="2"
          strokeDasharray="5 4"
        />

        {xTickIndexes.map(i => {
          const x = paddingX + (i / Math.max(points.length - 1, 1)) * (width - paddingX * 2)
          return (
            <text
              key={i}
              x={x}
              y={height - 2}
              textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
              fill={T.inkFaint}
              fontSize="11"
            >
              {points[i]?.label ?? ''}
            </text>
          )
        })}
      </svg>

      <div className="grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-3" style={{ color: T.inkMuted }}>
        <p className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full" style={{ background: T.brand }} />
          Current month (with projection)
        </p>
        <p className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full" style={{ background: 'var(--color-ink-muted)' }} />
          Last month
        </p>
        <p className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full" style={{ background: 'var(--color-success)' }} />
          Last 3 months average
        </p>
      </div>
    </div>
  )
}

export default async function TrendsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')
  if (!token) redirect('/login')

  const dashboard = await getDashboardData(token.value)
  const trends = await getTrendsData(token.value, dashboard.weeklySpending)

  return (
    <div className="mx-auto w-full max-w-[430px] flex flex-col gap-6 p-4">
      <PageHeader
        title="Trends"
        description={`Spending comparisons and trends`}
        backHref="/"
      />

      <section style={cardStyle} className="p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-[18px]" style={{ color: T.ink, fontFamily: T.display, fontWeight: 600 }}>
            4-Week Spending
          </h2>
          <p className="text-[13px]" style={{ color: T.inkMuted }}>
            Weekly expenses over the latest four weeks
          </p>
        </div>
        <WeeklyBars data={trends.weeklySpending} />
      </section>

      <section style={cardStyle} className="p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-[18px]" style={{ color: T.ink, fontFamily: T.display, fontWeight: 600 }}>
            Month Pace Comparison
          </h2>
          <p className="text-[13px]" style={{ color: T.inkMuted }}>
            Current month projection vs last month and 3-month average
          </p>
        </div>
        <MonthlyTrendChart points={trends.points} />
      </section>
    </div>
  )
}
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { CSSProperties } from 'react'

import { PageHeader } from '@/components/page-header'
import { getDashboardData } from '@/lib/finance-data'
import { getTrendsData, type TrendPoint } from '@/lib/trends-data'

const T = {
  brand: 'var(--color-brand)',
  card: 'var(--color-card)',
  border: 'var(--color-card-border)',
  divider: 'var(--color-divider)',
  ink: 'var(--color-ink)',
  inkMuted: 'var(--color-ink-muted)',
  inkFaint: 'var(--color-ink-faint)',
  display: 'var(--font-display)',
} as const

const cardStyle: CSSProperties = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 16,
}

function niceMax(values: number[]): number {
  const peak = Math.max(...values, 1)
  const magnitude = Math.pow(10, Math.floor(Math.log10(peak)))
  const step = magnitude / 2
  return Math.ceil((peak * 1.15) / step) * step
}

function WeeklyBars({ data }: { data: { label: string; spent: number }[] }) {
  const chartMax = niceMax(data.map(d => d.spent))
  return (
    <div className="flex items-end gap-3 h-[210px]">
      {data.map(item => {
        const height = Math.max((item.spent / chartMax) * 160, 5)
        return (
          <div key={item.label} className="flex flex-1 flex-col items-center justify-end gap-2">
            <span className="text-[12px]" style={{ color: T.inkMuted }}>
              {Math.round(item.spent).toLocaleString()}€
            </span>
            <div
              className="w-full rounded-t-[8px]"
              style={{
                height,
                background: T.brand,
              }}
            />
            <span className="text-[12px]" style={{ color: T.inkFaint }}>
              {item.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function buildPath(
  values: number[],
  width: number,
  height: number,
  maxValue: number,
  paddingX: number,
  paddingY: number,
): string {
  const drawableW = width - paddingX * 2
  const drawableH = height - paddingY * 2
  return values
    .map((value, idx) => {
      const x = paddingX + (idx / Math.max(values.length - 1, 1)) * drawableW
      const y = paddingY + (1 - value / Math.max(maxValue, 1)) * drawableH
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')
}

function buildAreaPath(
  values: number[],
  width: number,
  height: number,
  maxValue: number,
  paddingX: number,
  paddingY: number,
): string {
  const linePath = buildPath(values, width, height, maxValue, paddingX, paddingY)
  const drawableW = width - paddingX * 2
  const baselineY = height - paddingY
  const firstX = paddingX
  const lastX = paddingX + drawableW
  return `${linePath} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`
}

function MonthlyTrendChart({ points }: { points: TrendPoint[] }) {
  const width = 760
  const height = 280
  const paddingX = 20
  const paddingY = 16
  const maxY = niceMax(
    points.flatMap(p => [p.currentMonthProjected, p.lastMonth, p.averageLastThreeMonths]),
  )

  const currentLine = points.map(p => p.currentMonthProjected)
  const lastMonthLine = points.map(p => p.lastMonth)
  const avgLine = points.map(p => p.averageLastThreeMonths)

  const yTicks = [1, 0.75, 0.5, 0.25, 0].map(r => Math.round(maxY * r))
  const xTickIndexes = [0, 7, 14, 21, points.length - 1].filter(i => i < points.length)

  return (
    <div className="w-full flex flex-col gap-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {yTicks.map(v => {
          const y = paddingY + (1 - v / Math.max(maxY, 1)) * (height - paddingY * 2)
          return (
            <g key={v}>
              <line
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke={T.divider}
                strokeDasharray="4 4"
              />
              <text x={paddingX + 2} y={y - 4} fill={T.inkFaint} fontSize="11">
                {v.toLocaleString()}€
              </text>
            </g>
          )
        })}

        <path
          d={buildAreaPath(currentLine, width, height, maxY, paddingX, paddingY)}
          fill="color-mix(in srgb, var(--color-brand) 18%, transparent)"
        />

        <path
          d={buildPath(currentLine, width, height, maxY, paddingX, paddingY)}
          fill="none"
          stroke={T.brand}
          strokeWidth="3"
        />
        <path
          d={buildPath(lastMonthLine, width, height, maxY, paddingX, paddingY)}
          fill="none"
          stroke="var(--color-ink-muted)"
          strokeWidth="2"
        />
        <path
          d={buildPath(avgLine, width, height, maxY, paddingX, paddingY)}
          fill="none"
          stroke="var(--color-success)"
          strokeWidth="2"
          strokeDasharray="5 4"
        />

        {xTickIndexes.map(i => {
          const x = paddingX + (i / Math.max(points.length - 1, 1)) * (width - paddingX * 2)
          return (
            <text
              key={i}
              x={x}
              y={height - 2}
              textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
              fill={T.inkFaint}
              fontSize="11"
            >
              {points[i]?.label ?? ''}
            </text>
          )
        })}
      </svg>

      <div className="grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-3" style={{ color: T.inkMuted }}>
        <p className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full" style={{ background: T.brand }} />
          Current month (with projection)
        </p>
        <p className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full" style={{ background: 'var(--color-ink-muted)' }} />
          Last month
        </p>
        <p className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full" style={{ background: 'var(--color-success)' }} />
          Last 3 months average
        </p>
      </div>
    </div>
  )
}

export default async function TrendsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')
  if (!token) redirect('/login')

  const dashboard = await getDashboardData(token.value)
  const trends = await getTrendsData(token.value, dashboard.weeklySpending)

  return (
    <div className="mx-auto w-full max-w-[430px] flex flex-col gap-6 p-4">
      <PageHeader
        title="Trends"
        description={`Spending trends for ${trends.monthLabel}`}
        backHref="/"
      />

      <section style={cardStyle} className="p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-[18px]" style={{ color: T.ink, fontFamily: T.display, fontWeight: 600 }}>
            4-Week Spending
          </h2>
          <p className="text-[13px]" style={{ color: T.inkMuted }}>
            Weekly expenses over the latest four weeks
          </p>
        </div>
        <WeeklyBars data={trends.weeklySpending} />
      </section>

      <section style={cardStyle} className="p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-[18px]" style={{ color: T.ink, fontFamily: T.display, fontWeight: 600 }}>
            Month Pace Comparison
          </h2>
          <p className="text-[13px]" style={{ color: T.inkMuted }}>
            Current month projection vs last month and 3-month average
          </p>
        </div>
        <MonthlyTrendChart points={trends.points} />
      </section>
    </div>
  )
}
