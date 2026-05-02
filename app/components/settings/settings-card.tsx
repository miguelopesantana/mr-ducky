import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { T } from '@/lib/theme'

interface SettingsCardProps {
  title: string
  icon: LucideIcon
  children: ReactNode
  gap?: 4 | 5
  headerAction?: ReactNode
}

const GAP_CLASS: Record<4 | 5, string> = { 4: 'gap-4', 5: 'gap-5' }

export function SettingsCard({
  title,
  icon: IconComp,
  children,
  gap = 4,
  headerAction,
}: SettingsCardProps) {
  return (
    <div
      className={`flex flex-col ${GAP_CLASS[gap]} p-5`}
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 20,
      }}
    >
      <div className="flex items-center gap-2.5">
        <IconComp size={22} strokeWidth={1.75} color={T.ink} />
        <h2
          className="text-[22px] leading-none"
          style={{
            fontFamily: T.display,
            fontWeight: 500,
            color: T.ink,
          }}
        >
          {title}
        </h2>
        {headerAction ? <div className="ml-auto">{headerAction}</div> : null}
      </div>
      {children}
    </div>
  )
}
