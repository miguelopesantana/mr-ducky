'use client'

import { ShoppingCart, X } from 'lucide-react'
import { T } from '@/lib/theme'
import type { TransactionItem } from '@/lib/finance-data'
import { BottomSheet } from './bottom-sheet'
import { CategoryBadge } from './category-badge'
import {
  formatFullDate,
  transactionTypeLabel,
  type CategoryOption,
} from './formatters'

interface TransactionDetailSheetProps {
  transaction: TransactionItem | null
  category: CategoryOption | null
  onClose: () => void
}

export function TransactionDetailSheet({
  transaction,
  category,
  onClose,
}: TransactionDetailSheetProps) {
  return (
    <BottomSheet
      open={transaction !== null}
      onClose={onClose}
      ariaLabel="Transaction details"
    >
      {transaction && (
        <>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="mt-0.5 inline-flex size-7 items-center justify-center rounded-full border"
                style={{ borderColor: T.border, color: T.inkMuted }}
              >
                <ShoppingCart size={16} />
              </div>
              <div className="min-w-0">
                <h3
                  className="text-[18px] leading-6 truncate"
                  style={{ color: T.ink, fontFamily: T.display }}
                >
                  {transaction.merchantName}
                </h3>
                <p className="text-[14px]" style={{ color: T.inkMuted }}>
                  {category?.name ?? transactionTypeLabel(transaction.type)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="size-8 inline-flex items-center justify-center shrink-0"
              style={{ color: T.ink }}
            >
              <X size={24} />
            </button>
          </div>

          <DetailRow
            label="Amount"
            value={`${(Math.abs(transaction.amount) / 100).toFixed(2)}€`}
          />
          <DetailRow label="Date" value={formatFullDate(transaction.occurredAt)} />
          <div className="pt-4 flex items-center justify-between">
            <p className="text-[16px]" style={{ color: T.inkMuted }}>
              Category
            </p>
            {category ? (
              <CategoryBadge category={category} />
            ) : (
              <span className="text-[14px]" style={{ color: T.ink }}>
                -
              </span>
            )}
          </div>
        </>
      )}
    </BottomSheet>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="py-4 border-t flex items-center justify-between"
      style={{ borderColor: T.border }}
    >
      <p className="text-[16px]" style={{ color: T.inkMuted }}>
        {label}
      </p>
      <p
        className="text-[18px]"
        style={{ color: T.ink, fontFamily: T.display, fontWeight: 600 }}
      >
        {value}
      </p>
    </div>
  )
}
