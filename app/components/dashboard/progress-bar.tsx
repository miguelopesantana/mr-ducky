import type { CSSProperties } from 'react'
import { T, barGrowH, budgetColor } from '@/lib/theme'

interface BudgetProgressBarProps {
  spent: number
  budget: number
  color?: string
  animate?: boolean
  delayMs?: number
  durationMs?: number
  height?: number
}

export function BudgetProgressBar({
  spent,
  budget,
  color,
  animate = true,
  delayMs = 0,
  durationMs = 850,
  height = 4,
}: BudgetProgressBarProps) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
  const trackStyle: CSSProperties = {
    height,
    background: T.border,
    borderRadius: 9999,
  }
  const fillStyle: CSSProperties = {
    width: `${pct}%`,
    background: color ?? budgetColor(spent, budget),
    borderRadius: 9999,
    ...(animate ? barGrowH(delayMs, durationMs) : {}),
  }
  return (
    <div className="w-full overflow-hidden" style={trackStyle}>
      <div className="h-full" style={fillStyle} />
    </div>
  )
}
