'use client'

import { usePathname } from 'next/navigation'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div
      key={pathname}
      data-mr-scroll-lock
      className="flex-1 min-h-0 flex flex-col overflow-y-auto pb-12 mr-page-enter"
    >
      {children}
    </div>
  )
}
