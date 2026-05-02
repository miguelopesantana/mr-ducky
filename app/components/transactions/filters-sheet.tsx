'use client'

import { useState } from 'react'
import { CalendarDays, X } from 'lucide-react'
import { Icon } from '@iconify/react'
import { T } from '@/lib/theme'
import { BottomSheet } from './bottom-sheet'
import { Chip } from './chip'
import {
  fmtDisplayDate,
  fmtInputDate,
  type CategoryOption,
  type FiltersState,
} from './formatters'

interface FiltersSheetProps {
  open: boolean
  filters: FiltersState
  categories: CategoryOption[]
  onChange: (next: FiltersState) => void
  onClose: () => void
}

export function FiltersSheet({
  open,
  filters,
  categories,
  onChange,
  onClose,
}: FiltersSheetProps) {
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false)

  return (
    <BottomSheet open={open} onClose={onClose} ariaLabel="Filters">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-[18px]" style={{ color: T.ink, fontFamily: T.display }}>
          Filters
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="size-8 inline-flex items-center justify-center"
          style={{ color: T.ink }}
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="text-[16px]" style={{ color: T.ink, fontFamily: T.display }}>
            Date Range
          </p>
          <button
            type="button"
            onClick={() => setIsDateRangeOpen(o => !o)}
            className="h-12 w-full rounded-[16px] border px-3 flex items-center gap-3 text-left"
            style={{ borderColor: T.border }}
            aria-expanded={isDateRangeOpen}
          >
            <CalendarDays size={18} style={{ color: T.ink }} />
            <span
              className="text-[14px]"
              style={{ color: filters.from || filters.to ? T.ink : T.inkMuted }}
            >
              {fmtDisplayDate(filters.from)} - {fmtDisplayDate(filters.to)}
            </span>
          </button>
          {isDateRangeOpen && (
            <div className="grid grid-cols-2 gap-2 mt-1">
              <input
                type="date"
                value={fmtInputDate(filters.from)}
                onChange={e => onChange({ ...filters, from: e.target.value })}
                aria-label="From date"
                className="h-11 rounded-[16px] border px-3 bg-transparent outline-none text-[13px]"
                style={{ borderColor: T.border, color: T.ink }}
              />
              <input
                type="date"
                value={fmtInputDate(filters.to)}
                onChange={e => onChange({ ...filters, to: e.target.value })}
                aria-label="To date"
                className="h-11 rounded-[16px] border px-3 bg-transparent outline-none text-[13px]"
                style={{ borderColor: T.border, color: T.ink }}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[16px]" style={{ color: T.ink, fontFamily: T.display }}>
            Category
          </p>
          <div className="flex flex-wrap gap-2">
            <Chip
              active={filters.categoryIds.length === 0}
              onClick={() => onChange({ ...filters, categoryIds: [] })}
            >
              All
            </Chip>
            {categories.map(category => {
              const active = filters.categoryIds.includes(category.id)
              return (
                <Chip
                  key={category.id}
                  active={active}
                  onClick={() =>
                    onChange({
                      ...filters,
                      categoryIds: active
                        ? filters.categoryIds.filter(id => id !== category.id)
                        : [...filters.categoryIds, category.id],
                    })
                  }
                >
                  <Icon
                    icon={category.icon}
                    width={14}
                    height={14}
                    aria-hidden
                    style={{
                      color: active ? '#111' : category.color,
                      flexShrink: 0,
                    }}
                  />
                  {category.name}
                </Chip>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[16px]" style={{ color: T.ink, fontFamily: T.display }}>
            Transaction Type
          </p>
          <div className="flex gap-2">
            <Chip
              active={filters.type === 'all'}
              onClick={() => onChange({ ...filters, type: 'all' })}
            >
              All
            </Chip>
            <Chip
              active={filters.type === 'expense'}
              onClick={() => onChange({ ...filters, type: 'expense' })}
            >
              Debit
            </Chip>
            <Chip
              active={filters.type === 'income'}
              onClick={() => onChange({ ...filters, type: 'income' })}
            >
              Credit
            </Chip>
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}
