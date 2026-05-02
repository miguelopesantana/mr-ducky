'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { T } from '@/lib/theme'
import type { TransactionItem } from '@/lib/finance-data'
import { PageHeader } from '@/components/layout/page-header'
import { DayGroup } from './day-group'
import { FiltersSheet } from './filters-sheet'
import { SearchFilterBar } from './search-filter-bar'
import { TransactionDetailSheet } from './transaction-detail-sheet'
import type { CategoryOption, FiltersState } from './formatters'

interface Props {
  items: TransactionItem[]
  categories: CategoryOption[]
  initialFilters: FiltersState
}

export function TransactionsClient({ items, categories, initialFilters }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [selected, setSelected] = useState<TransactionItem | null>(null)
  const [filters, setFilters] = useState<FiltersState>(initialFilters)

  const categoriesById = useMemo(
    () => new Map(categories.map(category => [category.id, category])),
    [categories],
  )

  const activeFilterCount =
    (initialFilters.type !== 'all' ? 1 : 0) +
    initialFilters.categoryIds.length +
    (initialFilters.from ? 1 : 0) +
    (initialFilters.to ? 1 : 0)

  const grouped = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          const key = item.occurredAt
          if (!acc[key]) acc[key] = []
          acc[key].push(item)
          return acc
        },
        {} as Record<string, TransactionItem[]>,
      ),
    [items],
  )

  const dates = useMemo(() => Object.keys(grouped), [grouped])

  function applyFilters() {
    const next = new URLSearchParams()
    if (filters.q) next.set('q', filters.q)
    if (filters.type !== 'all') next.set('type', filters.type)
    for (const id of filters.categoryIds) next.append('categoryId', String(id))
    if (filters.from) next.set('from', filters.from)
    if (filters.to) next.set('to', filters.to)

    const query = next.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
    setIsFiltersOpen(false)
  }

  const selectedCategory = selected?.categoryId
    ? categoriesById.get(selected.categoryId) ?? null
    : null

  return (
    <>
      <div className="mx-auto flex w-full max-w-[430px] flex-col gap-6 px-4 pt-4">
        <PageHeader title="Transactions" subtitle="View and manage your transaction history" />

        <SearchFilterBar
          query={filters.q}
          onQueryChange={q => setFilters(prev => ({ ...prev, q }))}
          onSubmit={applyFilters}
          onOpenFilters={() => setIsFiltersOpen(true)}
          activeFilterCount={activeFilterCount}
        />

        <div className="h-px w-full" style={{ background: T.divider }} />

        <section className="flex flex-col gap-8 pb-2">
          {dates.map(date => (
            <DayGroup
              key={date}
              date={date}
              items={grouped[date]}
              categoriesById={categoriesById}
              onSelect={setSelected}
            />
          ))}
        </section>
      </div>

      <FiltersSheet
        open={isFiltersOpen}
        filters={filters}
        categories={categories}
        onChange={setFilters}
        onClose={applyFilters}
      />

      <TransactionDetailSheet
        transaction={selected}
        category={selectedCategory}
        onClose={() => setSelected(null)}
      />
    </>
  )
}
