import { Bell, Search } from 'lucide-react'

export function Header() {
  return (
    <header
      className="flex items-center justify-between h-[60px] px-4 border-b"
      style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}
    >
      <div className="flex items-center gap-2">
        <div
          className="size-8 rounded-[12px] flex items-center justify-center text-base"
          style={{ background: 'var(--color-brand)' }}
          aria-hidden
        >
          🦆
        </div>
        <span
          className="text-[18px] leading-7"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--color-ink)' }}
        >
          Mr Ducky
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          aria-label="Search"
          className="p-2 rounded-lg flex items-center justify-center"
          style={{ color: 'var(--color-ink)' }}
        >
          <Search size={18} strokeWidth={2} />
        </button>
        <button
          aria-label="Notifications"
          className="relative p-2 rounded-lg flex items-center justify-center"
          style={{ color: 'var(--color-ink)' }}
        >
          <Bell size={18} strokeWidth={2} />
          <span
            className="absolute top-1.5 right-1.5 size-1.5 rounded-full"
            style={{ background: '#ef4444' }}
          />
        </button>
      </div>
    </header>
  )
}
