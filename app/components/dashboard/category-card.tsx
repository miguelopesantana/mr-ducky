import { Icon } from '@iconify/react'
import { T, cardStyle, fadeIn } from '@/lib/theme'
import type { CategoryStat } from '@/lib/finance-data'
import { SectionHeader } from './section-header'
import { BudgetProgressBar } from './progress-bar'

interface CategoryCardProps {
  categories: CategoryStat[]
  fadeDelayMs?: number
  barBaseDelayMs?: number
  title?: string
  actionLabel?: string
}

export function CategoryCard({
  categories,
  fadeDelayMs = 180,
  barBaseDelayMs = 600,
  title = 'Category',
  actionLabel = 'See all transactions',
}: CategoryCardProps) {
  const visible = categories.filter(c => c.spent > 0)

  return (
    <section
      style={{ ...cardStyle, ...fadeIn(fadeDelayMs) }}
      className="py-5 flex flex-col gap-6"
    >
      <SectionHeader title={title} action={actionLabel} />

      <div className="flex flex-col gap-4 px-5">
        {visible.map((cat, i) => (
          <CategoryRow
            key={cat.name}
            category={cat}
            barDelayMs={barBaseDelayMs + i * 90}
          />
        ))}
      </div>
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
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between h-10">
        <div className="flex items-center gap-3">
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
          <div className="flex flex-col gap-1">
            <p
              className="text-[16px] tracking-[-0.3px]"
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

        <div className="flex flex-col items-end gap-0.5">
          <p
            className="text-[16px]"
            style={{ color: T.ink, fontFamily: T.display, fontWeight: 600 }}
          >
            {category.spent.toLocaleString()}€
          </p>
          <p className="text-[12px]" style={{ color: T.inkMuted }}>
            of {category.budget.toLocaleString()}€
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
