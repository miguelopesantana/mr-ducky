import { T } from '@/lib/theme'
import type { TransactionItem } from '@/lib/finance-data'
import { TransactionRow } from './transaction-row'
import { formatAmount, formatDateHeader, type CategoryOption } from './formatters'

interface DayGroupProps {
  date: string
  items: TransactionItem[]
  categoriesById: Map<number, CategoryOption>
  onSelect: (item: TransactionItem) => void
}

export function DayGroup({ date, items, categoriesById, onSelect }: DayGroupProps) {
  const total = items.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2
          className="text-[20px] leading-6"
          style={{ color: T.ink, fontFamily: T.display, fontWeight: 500 }}
        >
          {formatDateHeader(date)}
        </h2>
        <p
          className="text-[20px] leading-6"
          style={{ color: T.ink, fontFamily: T.display, fontWeight: 600 }}
        >
          {formatAmount(total)}
        </p>
      </div>

      {items.map(item => (
        <TransactionRow
          key={item.id}
          item={item}
          category={item.categoryId ? categoriesById.get(item.categoryId) ?? null : null}
          onClick={() => onSelect(item)}
        />
      ))}
    </div>
  )
}
