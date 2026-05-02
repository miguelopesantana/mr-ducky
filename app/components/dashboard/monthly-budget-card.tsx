import Link from 'next/link'
import { Check, Info } from 'lucide-react'
import { T, cardStyle, fadeIn } from '@/lib/theme'
import { BudgetProgressBar } from './progress-bar'
import { SectionHeader } from './section-header'

interface MonthlyBudgetCardProps {
  monthLabel: string
  totalSpent: number
  totalBudget: number
  fadeDelayMs?: number
  barDelayMs?: number
}

export function MonthlyBudgetCard({
  monthLabel,
  totalSpent,
  totalBudget,
  fadeDelayMs = 80,
  barDelayMs = 450,
}: MonthlyBudgetCardProps) {
  const underBudget = totalBudget - totalSpent

  return (
    <section
      style={{ ...cardStyle, ...fadeIn(fadeDelayMs) }}
      className="py-5 flex flex-col gap-3"
    >
      <SectionHeader
        title="This Month"
        subtitle={monthLabel}
        action="Manage budgets"
        actionHref="/budget"
      />

      <div className="px-5 flex flex-col gap-2">
        <div className="flex items-end gap-1">
          <span
            className="text-[36px] leading-[40px]"
            style={{ color: T.ink, fontFamily: T.display, fontWeight: 600 }}
          >
            {totalSpent.toLocaleString()}€
          </span>
          <span
            className="text-[18px] leading-7 inline-flex items-center gap-1"
            style={{ color: T.inkMuted }}
          >
            of {totalBudget.toLocaleString()}€
            <Link
              href="/budget"
              aria-label="How was this budget set?"
              className="size-5 inline-flex items-center justify-center rounded-full transition-opacity hover:opacity-100"
              style={{ color: T.inkMuted, opacity: 0.6 }}
            >
              <Info size={14} strokeWidth={2.25} />
            </Link>
          </span>
        </div>

        <div className="mt-1">
          <BudgetProgressBar
            spent={totalSpent}
            budget={totalBudget}
            delayMs={barDelayMs}
            durationMs={900}
          />
        </div>

        {underBudget > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <p className="text-[14px]" style={{ color: T.success }}>
              {underBudget.toLocaleString()}€ under budget
            </p>
            <Check size={14} strokeWidth={2.5} style={{ color: T.success }} />
          </div>
        )}
      </div>
    </section>
  )
}
