'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Phone } from 'lucide-react'
import { T } from '@/lib/theme'
import type { PendingAction } from '@/lib/chat-client'

interface Props {
  action: PendingAction
  onSettled: (id: string, status: 'confirmed' | 'rejected') => void
}

export function PendingActionCard({ action, onSettled }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [settled, setSettled] = useState<'confirmed' | 'rejected' | null>(null)

  const handle = async (verdict: 'confirm' | 'reject') => {
    if (busy || settled) return
    setBusy(true)
    try {
      const res = await fetch(`/api/chat/actions/${action.id}/${verdict}`, {
        method: 'POST',
      })
      if (!res.ok) return
      const status = verdict === 'confirm' ? 'confirmed' : 'rejected'
      setSettled(status)
      onSettled(action.id, status)
      if (verdict === 'confirm') {
        router.push('/actions?tab=calls')
      }
    } finally {
      setBusy(false)
    }
  }

  if (settled === 'rejected') {
    return (
      <p className="text-[13px] italic" style={{ color: T.inkFaint }}>
        Action cancelled.
      </p>
    )
  }

  if (settled === 'confirmed') {
    return (
      <p className="text-[13px] italic" style={{ color: T.success }}>
        Done — redirecting to Actions…
      </p>
    )
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl p-4"
      style={{ background: T.card, border: `1px solid ${T.border}` }}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0">
          <Phone size={16} style={{ color: T.brand }} />
        </div>
        <p className="text-[14px] leading-5" style={{ color: T.ink }}>
          {action.summary}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => handle('confirm')}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-semibold transition-opacity disabled:opacity-50"
          style={{ background: T.brand, color: '#0f0f0f' }}
        >
          <CheckCircle size={14} />
          Schedule it
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => handle('reject')}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-semibold transition-opacity disabled:opacity-50"
          style={{ background: T.overlayCard, color: T.inkMuted }}
        >
          <XCircle size={14} />
          Cancel
        </button>
      </div>
    </div>
  )
}
