'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/',             label: 'Home',         icon: 'home' },
  { href: '/transactions', label: 'Transactions', icon: 'swap_horiz' },
  { href: '/chat',         label: 'Chat',         icon: 'chat_bubble' },
  { href: '/actions',      label: 'Actions',      icon: 'bolt' },
  { href: '/settings',     label: 'Settings',     icon: 'settings' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex bg-background border-t border-border z-50">
      {NAV_ITEMS.map(({ href, label, icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-1"
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 26,
                color: active ? 'var(--color-brand)' : 'var(--muted-foreground)',
                fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              {icon}
            </span>
            <span
              className="text-xs"
              style={{ color: active ? 'var(--color-brand)' : 'var(--muted-foreground)' }}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
