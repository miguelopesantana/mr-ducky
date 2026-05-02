import type { CSSProperties } from 'react'
import { T, cardStyle, fadeIn, barGrowV } from '@/lib/theme'
import { niceMax } from '@/lib/chart'
import type { WeekBucket } from '@/lib/finance-data'
import { SectionHeader } from './section-header'

const CHART_H = 188
const Y_AXIS_W = 36

interface WeeklySpendingCardProps {
  data: WeekBucket[]
  title?: string
  actionLabel?: string
  actionHref?: string
  fadeDelayMs?: number
  barBaseDelayMs?: number
}

export function WeeklySpendingCard({
  data,
  title = '4-Week Spending',
  actionLabel = 'See trends',
  actionHref = '/trends',
  fadeDelayMs = 130,
  barBaseDelayMs = 500,
}: WeeklySpendingCardProps) {
  const chartMax = niceMax(data.map(w => w.spent))
  const yLabels = [chartMax, (chartMax * 3) / 4, chartMax / 2, chartMax / 4, 0].map(Math.round)

  return (
    <section
      style={{ ...cardStyle, ...fadeIn(fadeDelayMs) }}
      className="py-5 flex flex-col gap-4"
    >
      <SectionHeader title={title} action={actionLabel} actionHref={actionHref} />

      <div className="px-5 flex flex-col gap-2">
        <div className="flex">
          <YAxis chartMax={chartMax} labels={yLabels} />
          <PlotArea
            data={data}
            chartMax={chartMax}
            yLabels={yLabels}
            barBaseDelayMs={barBaseDelayMs}
          />
        </div>

        <XAxisLabels data={data} />
      </div>
    </section>
  )
}

function YAxis({ chartMax, labels }: { chartMax: number; labels: number[] }) {
  return (
    <div className="relative shrink-0" style={{ width: Y_AXIS_W, height: CHART_H }}>
      {labels.map(val => (
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
  )
}

function PlotArea({
  data,
  chartMax,
  yLabels,
  barBaseDelayMs,
}: {
  data: WeekBucket[]
  chartMax: number
  yLabels: number[]
  barBaseDelayMs: number
}) {
  return (
    <div className="relative flex-1" style={{ height: CHART_H }}>
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

      <div className="absolute inset-0 flex items-end gap-3">
        {data.map((w, i) => (
          <WeekBar
            key={i}
            spent={w.spent}
            chartMax={chartMax}
            delayMs={barBaseDelayMs + i * 80}
          />
        ))}
      </div>
    </div>
  )
}

function WeekBar({
  spent,
  chartMax,
  delayMs,
}: {
  spent: number
  chartMax: number
  delayMs: number
}) {
  const h = Math.max((spent / chartMax) * CHART_H, 4)
  const labelStyle: CSSProperties = {
    color: '#fff',
    fontFamily: T.text,
    fontWeight: 600,
    ...fadeIn(delayMs + 200, 400),
  }
  const barStyle: CSSProperties = {
    height: h,
    background: T.brand,
    ...barGrowV(delayMs),
  }
  return (
    <div className="flex flex-1 flex-col items-center">
      <span className="text-[14px] whitespace-nowrap" style={labelStyle}>
        {spent.toLocaleString()}€
      </span>
      <div className="w-full rounded-t-[8px]" style={barStyle} />
    </div>
  )
}

function XAxisLabels({ data }: { data: WeekBucket[] }) {
  return (
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
  )
}
