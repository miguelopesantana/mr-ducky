import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getTransactionsData } from '@/lib/finance-data'
import { TransactionsClient } from '@/components/transactions/transactions-client'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string
    type?: 'expense' | 'income'
    categoryId?: string | string[]
    from?: string
    to?: string
  }>
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')
  if (!token) redirect('/login')

  const params = (await searchParams) ?? {}
  const q = params.q?.trim() ?? ''
  const type = params.type
  const rawCategoryIds = params.categoryId
  const categoryIds = (Array.isArray(rawCategoryIds) ? rawCategoryIds : rawCategoryIds ? [rawCategoryIds] : [])
    .map(v => Number(v))
    .filter(n => Number.isFinite(n))
  const from = params.from?.trim() || undefined
  const to = params.to?.trim() || undefined

  const data = await getTransactionsData(token.value, {
    search: q || undefined,
    type,
    categoryIds: categoryIds.length ? categoryIds : undefined,
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
        categoryIds,
        from: from ?? '',
        to: to ?? '',
      }}
    />
  )
}
