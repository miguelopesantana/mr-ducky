import { Icon } from '@iconify/react'
import { T, cardStyle, fadeIn } from '@/lib/theme'
import type { CategoryStat } from '@/lib/finance-data'
import { BudgetProgressBar } from '@/components/dashboard/progress-bar'

interface CategoriesListProps {
  categories: CategoryStat[]
  fadeDelayMs?: number
  barBaseDelayMs?: number
}

export function CategoriesList({
  categories,
  fadeDelayMs = 160,
  barBaseDelayMs = 480,
}: CategoriesListProps) {
  if (categories.length === 0) {
    return (
      <section
        style={{ ...cardStyle, ...fadeIn(fadeDelayMs) }}
        className="px-5 py-6"
      >
        <p className="text-[14px]" style={{ color: T.inkMuted }}>
          No categories yet.
        </p>
      </section>
    )
  }

  return (
    <section
      style={{ ...cardStyle, ...fadeIn(fadeDelayMs) }}
      className="py-5 px-5 flex flex-col gap-5"
    >
      {categories.map((cat, i) => (
        <CategoryRow
          key={cat.name}
          category={cat}
          barDelayMs={barBaseDelayMs + i * 60}
        />
      ))}
    </section>
  )
}

function CategoryRow({
  category,
  barDelayMs,
}: {
  category: CategoryStat
  barDelayMs: number
}) {
  const ratioPct =
    category.budget > 0 ? Math.round((category.spent / category.budget) * 100) : null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="size-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: T.pink }}
          >
            <Icon
              icon={category.icon}
              width={22}
              height={22}
              style={{ color: T.card, display: 'block', flexShrink: 0 }}
            />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <p
              className="text-[16px] tracking-[-0.3px] truncate"
              style={{ color: T.ink, fontWeight: 500 }}
            >
              {category.name}
            </p>
            <p className="text-[12px]" style={{ color: T.inkMuted }}>
              {category.transactionCount} transaction
              {category.transactionCount === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <p
            className="text-[16px]"
            style={{ color: T.ink, fontFamily: T.display, fontWeight: 600 }}
          >
            {category.spent.toLocaleString()}€
          </p>
          <p
            className="text-[12px]"
            style={{ color: ratioPct === null ? T.inkFaint : T.inkMuted }}
          >
            {ratioPct === null
              ? 'no budget'
              : `${ratioPct}% of ${category.budget.toLocaleString()}€`}
          </p>
        </div>
      </div>

      <BudgetProgressBar
        spent={category.spent}
        budget={category.budget}
        delayMs={barDelayMs}
      />
    </div>
  )
}
