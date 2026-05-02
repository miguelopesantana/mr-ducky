import { T, cardStyle } from '@/lib/theme'
import { niceMax } from '@/lib/chart'
import type { TrendPoint } from '@/lib/trends-data'

interface MonthlyTrendCardProps {
  points: TrendPoint[]
  title?: string
  subtitle?: string
}

export function MonthlyTrendCard({
  points,
  title = 'Month Pace Comparison',
  subtitle = 'Current month projection vs last month and 3-month average',
}: MonthlyTrendCardProps) {
  return (
    <section style={cardStyle} className="p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2
          className="text-[18px]"
          style={{ color: T.ink, fontFamily: T.display, fontWeight: 600 }}
        >
          {title}
        </h2>
        <p className="text-[13px]" style={{ color: T.inkMuted }}>
          {subtitle}
        </p>
      </div>
      <MonthlyTrendChart points={points} />
    </section>
  )
}

const WIDTH = 760
const HEIGHT = 280
const PADDING_X = 20
const PADDING_Y = 16

function buildPath(values: number[], maxValue: number): string {
  const drawableW = WIDTH - PADDING_X * 2
  const drawableH = HEIGHT - PADDING_Y * 2
  return values
    .map((value, idx) => {
      const x = PADDING_X + (idx / Math.max(values.length - 1, 1)) * drawableW
      const y = PADDING_Y + (1 - value / Math.max(maxValue, 1)) * drawableH
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')
}

function buildAreaPath(values: number[], maxValue: number): string {
  const linePath = buildPath(values, maxValue)
  const drawableW = WIDTH - PADDING_X * 2
  const baselineY = HEIGHT - PADDING_Y
  const firstX = PADDING_X
  const lastX = PADDING_X + drawableW
  return `${linePath} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`
}

function MonthlyTrendChart({ points }: { points: TrendPoint[] }) {
  const maxY = niceMax(
    points.flatMap(p => [p.currentMonthProjected, p.lastMonth, p.averageLastThreeMonths]),
    1.15,
  )

  const currentLine = points.map(p => p.currentMonthProjected)
  const lastMonthLine = points.map(p => p.lastMonth)
  const avgLine = points.map(p => p.averageLastThreeMonths)

  const yTicks = [1, 0.75, 0.5, 0.25, 0].map(r => Math.round(maxY * r))
  const xTickIndexes = [0, 7, 14, 21, points.length - 1].filter(i => i < points.length)

  return (
    <div className="w-full flex flex-col gap-3">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto">
        {yTicks.map(v => {
          const y = PADDING_Y + (1 - v / Math.max(maxY, 1)) * (HEIGHT - PADDING_Y * 2)
          return (
            <g key={v}>
              <line
                x1={PADDING_X}
                y1={y}
                x2={WIDTH - PADDING_X}
                y2={y}
                stroke={T.divider}
                strokeDasharray="4 4"
              />
              <text x={PADDING_X + 2} y={y - 4} fill={T.inkFaint} fontSize="11">
                {v.toLocaleString()}€
              </text>
            </g>
          )
        })}

        <path
          d={buildAreaPath(currentLine, maxY)}
          fill="color-mix(in srgb, var(--color-brand) 18%, transparent)"
        />

        <path d={buildPath(currentLine, maxY)} fill="none" stroke={T.brand} strokeWidth="3" />
        <path d={buildPath(lastMonthLine, maxY)} fill="none" stroke={T.inkMuted} strokeWidth="2" />
        <path
          d={buildPath(avgLine, maxY)}
          fill="none"
          stroke={T.success}
          strokeWidth="2"
          strokeDasharray="5 4"
        />

        {xTickIndexes.map(i => {
          const x = PADDING_X + (i / Math.max(points.length - 1, 1)) * (WIDTH - PADDING_X * 2)
          const anchor = i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'
          return (
            <text
              key={i}
              x={x}
              y={HEIGHT - 2}
              textAnchor={anchor}
              fill={T.inkFaint}
              fontSize="11"
            >
              {points[i]?.label ?? ''}
            </text>
          )
        })}
      </svg>

      <div className="grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-3" style={{ color: T.inkMuted }}>
        <Legend color={T.brand} label="Current month (with projection)" />
        <Legend color={T.inkMuted} label="Last month" />
        <Legend color={T.success} label="Last 3 months average" />
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <p className="flex items-center gap-2">
      <span className="inline-block size-2 rounded-full" style={{ background: color }} />
      {label}
    </p>
  )
}
