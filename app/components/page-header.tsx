import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  backHref,
}: {
  title: string
  description?: ReactNode
  backHref?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Back"
            className="size-8 inline-flex items-center justify-center rounded-full -ml-1"
            style={{ color: 'var(--color-ink)' }}
          >
            <ChevronLeft size={22} />
          </Link>
        )}
        <h1
          className="text-[24px] leading-none"
          style={{
            color: 'var(--color-ink)',
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
          }}
        >
          {title}
        </h1>
      </div>
      {description && (
        <p
          className="text-[16px] tracking-[-0.3px]"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          {description}
        </p>
      )}
    </div>
  )
}
