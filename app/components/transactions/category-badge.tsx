import { Icon } from '@iconify/react'
import { T } from '@/lib/theme'
import type { CategoryOption } from './formatters'

interface CategoryBadgeProps {
  category: CategoryOption
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1"
      style={{ borderColor: T.border, color: T.ink }}
    >
      <Icon
        icon={category.icon}
        width={14}
        height={14}
        aria-hidden
        style={{ color: category.color, flexShrink: 0 }}
      />
      <span className="text-[13px] leading-4">{category.name}</span>
    </div>
  )
}
