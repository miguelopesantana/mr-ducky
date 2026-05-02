import type { CSSProperties } from 'react'

export const T = {
  brand: 'var(--color-brand)',
  brandBright: 'var(--color-brand-bright)',
  card: 'var(--color-card)',
  border: 'var(--color-card-border)',
  divider: 'var(--color-divider)',
  ink: 'var(--color-ink)',
  inkMuted: 'var(--color-ink-muted)',
  inkFaint: 'var(--color-ink-faint)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  pink: 'var(--color-icon-pink)',
  display: 'var(--font-display)',
  text: 'var(--font-text)',
} as const

export const cardStyle: CSSProperties = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 16,
}

const EASE = 'cubic-bezier(0.2, 0.7, 0.2, 1)'

export function fadeIn(delayMs: number, durationMs = 500): CSSProperties {
  return { animation: `mr-fade-in-up ${durationMs}ms ${delayMs}ms ${EASE} both` }
}

export function barGrowH(delayMs: number, durationMs = 800): CSSProperties {
  return {
    transformOrigin: 'left center',
    animation: `mr-bar-grow-h ${durationMs}ms ${delayMs}ms ${EASE} both`,
  }
}

export function barGrowV(delayMs: number, durationMs = 700): CSSProperties {
  return {
    transformOrigin: 'bottom',
    animation: `mr-bar-grow-v ${durationMs}ms ${delayMs}ms ${EASE} both`,
  }
}

export function budgetColor(spent: number, budget: number): string {
  if (budget <= 0) return T.brand
  const ratio = spent / budget
  if (ratio > 1) return T.danger
  if (ratio >= 0.75) return T.warning
  return T.success
}
