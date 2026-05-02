import { T } from '@/lib/theme'
import type { TransactionItem } from '@/lib/finance-data'
import { CategoryBadge } from './category-badge'
import { formatAmount, type CategoryOption } from './formatters'

interface TransactionRowProps {
  item: TransactionItem
  category: CategoryOption | null
  onClick: () => void
}

export function TransactionRow({ item, category, onClick }: TransactionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[16px] border px-4 py-3 flex flex-col gap-2 text-left"
      style={{ background: T.card, borderColor: T.border }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-[16px] leading-5 truncate"
            style={{ color: T.ink, fontFamily: T.display, fontWeight: 500 }}
          >
            {item.merchantName}
          </p>
          <p className="text-[13px] leading-4" style={{ color: T.inkMuted }}>
            {item.bank}
          </p>
        </div>
        <p
          className="text-[16px] leading-5 shrink-0"
          style={{
            color: item.type === 'income' ? T.success : T.ink,
            fontFamily: T.display,
            fontWeight: 600,
          }}
        >
          {formatAmount(item.amount)}
        </p>
      </div>

      {category && (
        <div className="self-start">
          <CategoryBadge category={category} />
        </div>
      )}
    </button>
  )
}
