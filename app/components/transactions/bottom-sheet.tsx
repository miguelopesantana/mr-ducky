'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

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

    const scrollables = Array.from(
      document.querySelectorAll<HTMLElement>('[data-mr-scroll-lock]'),
    )
    const previous = scrollables.map(el => el.style.overflow)
    scrollables.forEach(el => {
      el.style.overflow = 'hidden'
    })

    return () => {
      document.body.style.overflow = body
      document.documentElement.style.overflow = html
      scrollables.forEach((el, i) => {
        el.style.overflow = previous[i]
      })
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

  useEffect(() => {
    if (!mounted || closing) return

    function onWheel(e: WheelEvent) {
      if (e.deltaY > 0) onClose()
    }

    let touchStartY: number | null = null
    function onTouchStart(e: TouchEvent) {
      touchStartY = e.touches[0]?.clientY ?? null
    }
    function onTouchMove(e: TouchEvent) {
      if (touchStartY === null) return
      const dy = (e.touches[0]?.clientY ?? touchStartY) - touchStartY
      if (dy > 40) {
        touchStartY = null
        onClose()
      }
    }
    function onTouchEnd() {
      touchStartY = null
    }

    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [mounted, closing, onClose])

  if (!mounted || typeof document === 'undefined') return null

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[100] bg-black/70"
        onClick={onClose}
        style={{
          animation: closing
            ? `mr-backdrop-out ${EXIT_MS}ms ${EXIT_EASE} both`
            : `mr-backdrop-in ${ENTER_MS}ms ${ENTER_EASE} both`,
        }}
      />
      <div className="fixed inset-0 z-[110] flex justify-center items-end pointer-events-none">
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
          <div className="px-5 pt-2 pb-8">{children}</div>
        </section>
      </div>
    </>,
    document.body,
  )
}
