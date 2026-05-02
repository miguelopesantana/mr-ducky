import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/layout/page-header'
import { WeeklyBarsCard } from '@/components/trends/weekly-bars-card'
import { MonthlyTrendCard } from '@/components/trends/monthly-trend-card'
import { getDashboardData } from '@/lib/finance-data'
import { getTrendsData } from '@/lib/trends-data'

export default async function TrendsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')
  if (!token) redirect('/login')

  const dashboard = await getDashboardData(token.value)
  const trends = await getTrendsData(token.value, dashboard.weeklySpending)

  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-col gap-6 px-4 pt-4">
      <PageHeader
        title="Trends"
        subtitle="Spending comparisons and trends"
        backHref="/"
      />

      <WeeklyBarsCard data={trends.weeklySpending} />

      <MonthlyTrendCard points={trends.points} />
    </div>
  )
}
