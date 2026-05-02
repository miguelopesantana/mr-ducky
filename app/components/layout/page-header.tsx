import type { CSSProperties } from 'react'

interface PageHeaderProps {
  title: string
  subtitle: string
  style?: CSSProperties
  divider?: boolean
}

export function PageHeader({
  title,
  subtitle,
  style,
  divider = true,
}: PageHeaderProps) {
  return (
    <div className="shrink-0" style={style}>
      <div className="flex flex-col gap-1">
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
        <p
          className="text-[16px] leading-tight tracking-[-0.3px]"
          style={{ color: '#B5B5B5' }}
        >
          {subtitle}
        </p>
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
