import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getTransactionsData } from '@/lib/finance-data'
import { TransactionsClient } from '@/components/transactions/transactions-client'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams?: {
    q?: string
    type?: 'expense' | 'income'
    categoryId?: string
    from?: string
    to?: string
  }
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')
  if (!token) redirect('/login')

  const q = searchParams?.q?.trim() ?? ''
  const type = searchParams?.type
  const categoryId = searchParams?.categoryId ? Number(searchParams.categoryId) : undefined
  const from = searchParams?.from?.trim() || undefined
  const to = searchParams?.to?.trim() || undefined

  const data = await getTransactionsData(token.value, {
    search: q || undefined,
    type,
    categoryId: Number.isFinite(categoryId) ? categoryId : undefined,
    from,
    to,
  })

  return (
    <TransactionsClient
      items={data.items}
      categories={Array.from(data.categories.values())}
      initialFilters={{
        q,
        type: type ?? 'all',
        categoryId: Number.isFinite(categoryId) ? (categoryId ?? null) : null,
        from: from ?? '',
        to: to ?? '',
      }}
    />
  )
}
