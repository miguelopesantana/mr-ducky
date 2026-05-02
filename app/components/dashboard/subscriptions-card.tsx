import { T, cardStyle, fadeIn } from '@/lib/theme'
import type { SubscriptionItem } from '@/lib/finance-data'
import { SectionHeader } from './section-header'

interface SubscriptionsCardProps {
  subscriptions: SubscriptionItem[]
  total: number
  fadeDelayMs?: number
}

export function SubscriptionsCard({
  subscriptions,
  total,
  fadeDelayMs = 280,
}: SubscriptionsCardProps) {
  return (
    <section
      style={{ ...cardStyle, ...fadeIn(fadeDelayMs) }}
      className="py-5 flex flex-col gap-6"
    >
      <SectionHeader title="Subscriptions" />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 px-5">
          {subscriptions.map(sub => (
            <SubscriptionRow key={sub.name} subscription={sub} />
          ))}
        </div>

        <div className="px-4">
          <div className="h-px w-full" style={{ background: T.divider }} />
        </div>

        <div className="flex items-center justify-between px-5">
          <span
            className="text-[16px] tracking-[-0.3px]"
            style={{ color: T.inkMuted }}
          >
            Total Monthly
          </span>
          <span
            className="text-[18px]"
            style={{ color: T.ink, fontFamily: T.display, fontWeight: 600 }}
          >
            {total.toFixed(2)}€
          </span>
        </div>
      </div>
    </section>
  )
}

function SubscriptionRow({ subscription }: { subscription: SubscriptionItem }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="size-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: '#000' }}
        >
          <span
            className="text-[18px] leading-none"
            style={{
              color: subscription.color,
              fontFamily: T.display,
              fontWeight: 700,
            }}
          >
            {subscription.initials}
          </span>
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <p
            className="text-[16px] tracking-[-0.3px] truncate"
            style={{ color: T.ink, fontWeight: 500 }}
          >
            {subscription.name}
          </p>
          <p className="text-[12px]" style={{ color: T.inkMuted }}>
            {subscription.cycleLabel}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <p
          className="text-[16px]"
          style={{ color: T.ink, fontFamily: T.display, fontWeight: 600 }}
        >
          {subscription.amount.toFixed(2)}€
        </p>
        {subscription.billedThisMonth ? <BilledBadge /> : null}
      </div>
    </div>
  )
}

function BilledBadge() {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.08em]"
      style={{
        color: T.success,
        background: 'color-mix(in srgb, var(--color-success) 14%, transparent)',
        fontWeight: 700,
      }}
    >
      Billed
    </span>
  )
}
