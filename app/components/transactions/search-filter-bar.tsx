import { Filter, Search } from 'lucide-react'
import { T } from '@/lib/theme'

interface SearchFilterBarProps {
  query: string
  onQueryChange: (value: string) => void
  onSubmit: () => void
  onOpenFilters: () => void
  activeFilterCount: number
}

export function SearchFilterBar({
  query,
  onQueryChange,
  onSubmit,
  onOpenFilters,
  activeFilterCount,
}: SearchFilterBarProps) {
  return (
    <form
      className="flex items-center gap-3"
      onSubmit={e => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <div
        className="flex-1 h-12 rounded-2xl border px-4 flex items-center gap-3"
        style={{ background: '#111', borderColor: T.border }}
      >
        <Search size={22} style={{ color: T.ink }} />
        <input
          type="search"
          name="q"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="Search..."
          className="w-full bg-transparent outline-none text-[16px]"
          style={{ color: T.ink }}
          aria-label="Search transactions"
        />
      </div>
      <button
        type="button"
        aria-label="Filter transactions"
        onClick={onOpenFilters}
        className="relative size-12 rounded-2xl inline-flex items-center justify-center"
        style={{ background: T.brand, color: '#111' }}
      >
        <Filter size={24} />
        {activeFilterCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full inline-flex items-center justify-center text-[12px] leading-none"
            style={{ background: '#111', color: T.brand, fontWeight: 600 }}
            aria-label={`${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'}`}
          >
            {activeFilterCount}
          </span>
        )}
      </button>
    </form>
  )
}
