import { authedClient } from './api-client'

const CENTS = 100
const DAY_MS = 24 * 60 * 60 * 1000

interface ApiTransaction {
  amount: number
  occurredAt: string
  type: 'expense' | 'income'
}

interface ApiTransactionPage {
  items: ApiTransaction[]
  nextCursor: string | null
}

interface MonthSeries {
  key: string
  daysInMonth: number
  cumulativeByDay: number[]
}

export interface TrendPoint {
  day: number
  label: string
  currentMonthProjected: number
  lastMonth: number
  averageLastThreeMonths: number
}

export interface TrendsData {
  monthLabel: string
  weeklySpending: { label: string; spent: number }[]
  points: TrendPoint[]
}

function getMonthKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split('-').map(Number)
  const dt = new Date(year, mon - 1 + delta, 1)
  return getMonthKey(dt)
}

function parseMonth(month: string): { year: number; monthIndex: number } {
  const [y, m] = month.split('-').map(Number)
  return { year: y, monthIndex: m - 1 }
}

function daysInMonth(month: string): number {
  const { year, monthIndex } = parseMonth(month)
  return new Date(year, monthIndex + 1, 0).getDate()
}

function monthDateRange(month: string): { from: string; to: string } {
  const { year, monthIndex } = parseMonth(month)
  const firstDay = new Date(year, monthIndex, 1)
  const lastDay = new Date(year, monthIndex + 1, 0)
  return {
    from: firstDay.toISOString().slice(0, 10),
    to: lastDay.toISOString().slice(0, 10),
  }
}

function toMonthLabel(month: string): string {
  const { year, monthIndex } = parseMonth(month)
  return new Date(year, monthIndex, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
}

function addMonthsCumulative(expensesByDay: number[], totalDays: number): number[] {
  const cumulative: number[] = []
  let running = 0
  for (let i = 1; i <= totalDays; i += 1) {
    running += expensesByDay[i] ?? 0
    cumulative.push(running)
  }
  return cumulative
}

function valueAtMappedDay(series: number[], monthDays: number, targetDay: number, targetMonthDays: number): number {
  const mappedDay = Math.max(1, Math.round((targetDay / targetMonthDays) * monthDays))
  return series[Math.min(mappedDay, monthDays) - 1] ?? 0
}

async function fetchMonthExpenses(
  token: string,
  month: string,
): Promise<MonthSeries> {
  const client = authedClient(token)
  const range = monthDateRange(month)
  const totalDays = daysInMonth(month)
  const dailyExpenses = Array.from({ length: totalDays + 1 }, () => 0)

  let cursor: string | null = null
  do {
    const params = new URLSearchParams()
    params.set('type', 'expense')
    params.set('from', range.from)
    params.set('to', range.to)
    params.set('limit', '100')
    if (cursor) params.set('cursor', cursor)

    const res = await client<ApiTransactionPage>(`/transactions?${params.toString()}`, { cache: 'no-store' })
    if (!res.ok) {
      throw new Error(`Transactions fetch failed for ${month} (${res.status}): ${res.error}`)
    }

    for (const item of res.data.items) {
      const day = new Date(item.occurredAt).getUTCDate()
      if (day >= 1 && day <= totalDays) {
        dailyExpenses[day] += Math.abs(item.amount) / CENTS
      }
    }

    cursor = res.data.nextCursor
  } while (cursor)

  return {
    key: month,
    daysInMonth: totalDays,
    cumulativeByDay: addMonthsCumulative(dailyExpenses, totalDays),
  }
}

function predictCurrentMonth(
  current: MonthSeries,
  baselineAverageLastThreeMonths: number,
): number[] {
  const now = new Date()
  const elapsedDay = Math.min(Math.max(now.getDate(), 1), current.daysInMonth)
  const spentSoFar = current.cumulativeByDay[elapsedDay - 1] ?? 0
  const avgSoFar = elapsedDay > 0 ? spentSoFar / elapsedDay : 0
  const baselineDaily = baselineAverageLastThreeMonths / current.daysInMonth
  const projectedDaily = avgSoFar > 0 ? (avgSoFar + baselineDaily) / 2 : baselineDaily

  const projected = [...current.cumulativeByDay]
  for (let i = elapsedDay; i < current.daysInMonth; i += 1) {
    projected[i] = spentSoFar + (i + 1 - elapsedDay) * projectedDaily
  }
  return projected
}

export async function getTrendsData(
  token: string,
  weeklySpending: { label: string; spent: number }[],
): Promise<TrendsData> {
  const now = new Date()
  const currentMonth = getMonthKey(now)
  const prev1 = shiftMonth(currentMonth, -1)
  const prev2 = shiftMonth(currentMonth, -2)
  const prev3 = shiftMonth(currentMonth, -3)

  const [current, lastMonth, minus2, minus3] = await Promise.all([
    fetchMonthExpenses(token, currentMonth),
    fetchMonthExpenses(token, prev1),
    fetchMonthExpenses(token, prev2),
    fetchMonthExpenses(token, prev3),
  ])

  const currentDays = current.daysInMonth
  const lastMonthLine = Array.from({ length: currentDays }, (_, i) =>
    valueAtMappedDay(lastMonth.cumulativeByDay, lastMonth.daysInMonth, i + 1, currentDays),
  )
  const avgThreeLine = Array.from({ length: currentDays }, (_, i) => {
    const day = i + 1
    const v1 = valueAtMappedDay(lastMonth.cumulativeByDay, lastMonth.daysInMonth, day, currentDays)
    const v2 = valueAtMappedDay(minus2.cumulativeByDay, minus2.daysInMonth, day, currentDays)
    const v3 = valueAtMappedDay(minus3.cumulativeByDay, minus3.daysInMonth, day, currentDays)
    return (v1 + v2 + v3) / 3
  })
  const projectedCurrent = predictCurrentMonth(current, avgThreeLine[currentDays - 1] ?? 0)

  const points: TrendPoint[] = Array.from({ length: currentDays }, (_, i) => {
    const day = i + 1
    const date = new Date(now.getFullYear(), now.getMonth(), day)
    return {
      day,
      label: date.toLocaleString('en', { month: 'short', day: 'numeric' }),
      currentMonthProjected: projectedCurrent[i] ?? 0,
      lastMonth: lastMonthLine[i] ?? 0,
      averageLastThreeMonths: avgThreeLine[i] ?? 0,
    }
  })

  return {
    monthLabel: toMonthLabel(currentMonth),
    weeklySpending,
    points,
  }
}
