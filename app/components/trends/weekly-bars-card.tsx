import { T, cardStyle } from '@/lib/theme'
import { niceMax } from '@/lib/chart'

interface WeeklyBarsCardProps {
  data: { label: string; spent: number }[]
  title?: string
  subtitle?: string
}

export function WeeklyBarsCard({
  data,
  title = '4-Week Spending',
  subtitle = 'Weekly expenses over the latest four weeks',
}: WeeklyBarsCardProps) {
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
      <WeeklyBars data={data} />
    </section>
  )
}

function WeeklyBars({ data }: { data: { label: string; spent: number }[] }) {
  const chartMax = niceMax(data.map(d => d.spent), 1.15)
  return (
    <div className="flex items-end gap-3 h-[210px]">
      {data.map(item => {
        const height = Math.max((item.spent / chartMax) * 160, 5)
        return (
          <div
            key={item.label}
            className="flex flex-1 flex-col items-center justify-end gap-2"
          >
            <span className="text-[12px]" style={{ color: T.inkMuted }}>
              {Math.round(item.spent).toLocaleString()}€
            </span>
            <div
              className="w-full rounded-t-[8px]"
              style={{ height, background: T.brand }}
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
