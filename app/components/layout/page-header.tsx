import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'

import { T } from '@/lib/theme'

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  backHref?: string
  style?: CSSProperties
  divider?: boolean
}

export function PageHeader({
  title,
  subtitle,
  backHref,
  style,
  divider = false,
}: PageHeaderProps) {
  return (
    <div className="shrink-0" style={style}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {backHref ? (
            <Link
              href={backHref}
              aria-label="Back"
              className="size-8 inline-flex items-center justify-center rounded-full -ml-1"
              style={{ color: T.ink }}
            >
              <ChevronLeft size={22} />
            </Link>
          ) : null}
          <h1
            className="text-[24px] leading-none"
            style={{ fontFamily: T.display, fontWeight: 500, color: T.ink }}
          >
            {title}
          </h1>
        </div>
        {subtitle ? (
          <p
            className="text-[16px] leading-tight tracking-[-0.3px]"
            style={{ color: T.inkMuted }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {divider && (
        <div className="mt-6" style={{ borderTop: `1px solid ${T.border}` }} />
      )}
    </div>
  )
}
