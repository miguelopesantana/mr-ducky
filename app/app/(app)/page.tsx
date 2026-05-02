import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getDashboardData, type DashboardData } from '@/lib/finance-data'
import { fadeIn, T } from '@/lib/theme'
import { PageHeader } from '@/components/layout/page-header'
import { MonthlyBudgetCard } from '@/components/dashboard/monthly-budget-card'
import { WeeklySpendingCard } from '@/components/dashboard/weekly-spending-card'
import { CategoryCard } from '@/components/dashboard/category-card'
import { SubscriptionsCard } from '@/components/dashboard/subscriptions-card'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')
  if (!token) redirect('/login')

  let data: DashboardData
  try {
    data = await getDashboardData(token.value)
  } catch (err) {
    return <DashboardError message={err instanceof Error ? err.message : String(err)} />
  }

  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-col gap-6 px-4 pt-4 mb-6">
      <PageHeader
        title="Dashboard"
        subtitle="Track your spending and financial insights"
        style={fadeIn(0, 450)}
      />

      <MonthlyBudgetCard
        monthLabel={data.monthLabel}
        totalSpent={data.totalSpent}
        totalBudget={data.totalBudget}
      />

      <WeeklySpendingCard data={data.weeklySpending} actionHref="/trends" />

      <CategoryCard categories={data.categories} />

      <SubscriptionsCard
        subscriptions={data.subscriptions}
        total={data.subscriptionTotal}
      />
    </div>
  )
}

function DashboardError({ message }: { message: string }) {
  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-col gap-6 px-4 pt-4">
      <PageHeader
        title="Dashboard"
        subtitle="Track your spending and financial insights"
      />
      <p className="text-[14px]" style={{ color: T.inkMuted }}>
        Could not load data: {message}
      </p>
    </div>
  )
}
