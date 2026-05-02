'use client'

import { useEffect, useState } from 'react'

const ENTER_MS = 320
const EXIT_MS = 240
const ENTER_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'
const EXIT_EASE = 'cubic-bezier(0.4, 0, 0.6, 1)'

type Props = {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  ariaLabel?: string
}

export function BottomSheet({ open, onClose, children, ariaLabel }: Props) {
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      setClosing(false)
      return
    }
    if (!mounted) return
    setClosing(true)
    const t = setTimeout(() => {
      setMounted(false)
      setClosing(false)
    }, EXIT_MS)
    return () => clearTimeout(t)
  }, [open, mounted])

  useEffect(() => {
    if (!mounted) return
    const body = document.body.style.overflow
    const html = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = body
      document.documentElement.style.overflow = html
    }
  }, [mounted])

  useEffect(() => {
    if (!mounted) return
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [mounted, onClose])

  if (!mounted) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/70"
        onClick={onClose}
        style={{
          animation: closing
            ? `mr-backdrop-out ${EXIT_MS}ms ${EXIT_EASE} both`
            : `mr-backdrop-in ${ENTER_MS}ms ${ENTER_EASE} both`,
        }}
      />
      <div className="fixed inset-0 z-[60] flex justify-center items-end pointer-events-none">
        <section
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          className="pointer-events-auto w-full max-w-[430px] rounded-t-3xl border"
          style={{
            background: '#232426',
            borderColor: '#2f3032',
            animation: closing
              ? `mr-sheet-out ${EXIT_MS}ms ${EXIT_EASE} both`
              : `mr-sheet-in ${ENTER_MS}ms ${ENTER_EASE} both`,
            willChange: 'transform',
          }}
        >
          <div className="pt-3 pb-2 touch-none select-none">
            <div className="mx-auto h-1.5 w-16 rounded-full bg-white/50" />
          </div>
          <div
            className="overflow-y-auto overscroll-contain px-5 pt-2 pb-8"
            style={{
              maxHeight: 'calc(100dvh - max(env(safe-area-inset-top), 24px) - 36px)',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
            }}
          >
            {children}
          </div>
        </section>
      </div>
    </>
  )
}
