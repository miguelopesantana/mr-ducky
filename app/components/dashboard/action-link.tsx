import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { T } from '@/lib/theme'

interface ActionLinkProps {
  label: string
  href?: string
  onClick?: () => void
}

const CLASSES = 'flex items-center gap-1 text-[14px] py-2 px-2 rounded-lg shrink-0'
const STYLE = { color: T.brand, fontWeight: 500 } as const

export function ActionLink({ label, href, onClick }: ActionLinkProps) {
  if (href) {
    return (
      <Link href={href} onClick={onClick} className={CLASSES} style={STYLE}>
        {label}
        <ChevronRight size={14} strokeWidth={2.5} />
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={CLASSES} style={STYLE}>
      {label}
      <ChevronRight size={14} strokeWidth={2.5} />
    </button>
  )
}
