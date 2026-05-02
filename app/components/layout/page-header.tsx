import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'

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
  divider = true,
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
              style={{ color: 'var(--color-ink)' }}
            >
              <ChevronLeft size={22} />
            </Link>
          ) : null}
          <h1
            className="text-[24px] leading-none"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              color: '#FFFFFF',
            }}
          >
            {title}
          </h1>
        </div>
        {subtitle ? (
          <p
            className="text-[16px] leading-tight tracking-[-0.3px]"
            style={{ color: '#B5B5B5' }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {divider && (
        <div
          className="mt-6"
          style={{ borderTop: '1px solid var(--color-card-border)' }}
        />
      )}
    </div>
  )
}
