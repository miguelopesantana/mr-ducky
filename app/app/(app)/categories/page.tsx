import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getDashboardData, type DashboardData } from '@/lib/finance-data'
import { fadeIn, T, cardStyle } from '@/lib/theme'
import { PageHeader } from '@/components/layout/page-header'
import { CategoriesList } from '@/components/categories/categories-list'

export default async function CategoriesPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')
  if (!token) redirect('/login')

  let data: DashboardData
  try {
    data = await getDashboardData(token.value)
  } catch (err) {
    return (
      <CategoriesError
        message={err instanceof Error ? err.message : String(err)}
      />
    )
  }

  const sorted = [...data.categories].sort((a, b) => b.spent - a.spent)
  const totalSpent = sorted.reduce((s, c) => s + c.spent, 0)
  const totalBudget = sorted.reduce((s, c) => s + c.budget, 0)
  const txCount = sorted.reduce((s, c) => s + c.transactionCount, 0)

  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-col gap-6 px-4 pt-4 mb-6">
      <PageHeader
        title="Categories"
        subtitle={`Spend by category for ${data.monthLabel}`}
        backHref="/"
        style={fadeIn(0, 450)}
      />

      <section
        style={{ ...cardStyle, ...fadeIn(80) }}
        className="p-5 flex flex-col gap-2"
      >
        <p className="text-[14px]" style={{ color: T.inkMuted }}>
          This month
        </p>
        <div className="flex items-end gap-2">
          <span
            className="text-[36px] leading-[40px]"
            style={{ color: T.ink, fontFamily: T.display, fontWeight: 600 }}
          >
            {totalSpent.toLocaleString()}€
          </span>
          <span className="text-[14px] leading-7" style={{ color: T.inkMuted }}>
            of {totalBudget.toLocaleString()}€
          </span>
        </div>
        <p className="text-[12px]" style={{ color: T.inkFaint }}>
          {txCount} transaction{txCount === 1 ? '' : 's'} across {sorted.length}{' '}
          categor{sorted.length === 1 ? 'y' : 'ies'}
        </p>
      </section>

      <CategoriesList categories={sorted} />
    </div>
  )
}

function CategoriesError({ message }: { message: string }) {
  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-col gap-6 px-4 pt-4">
      <PageHeader title="Categories" backHref="/" />
      <p className="text-[14px]" style={{ color: T.inkMuted }}>
        Could not load data: {message}
      </p>
    </div>
  )
}
