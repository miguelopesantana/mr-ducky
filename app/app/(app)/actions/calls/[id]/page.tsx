import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { CallStatusBadge } from '@/components/actions/call-status-badge'
import { INITIAL_CALLS } from '@/components/actions/mock-data'
import { T } from '@/lib/theme'

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const call = INITIAL_CALLS.find(c => c.id === id)
  if (!call) notFound()

  const timestamp = call.completedAt ?? call.scheduledFor
  const timestampLabel = call.completedAt ? 'Completed' : 'Scheduled for'

  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-col gap-6 px-4 pt-4">
      <PageHeader title="Call" backHref="/actions" />

      <div
        className="p-5 flex flex-col gap-4"
        style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16 }}
      >
        <CallStatusBadge status={call.status} />
        <h2
          className="text-[22px] tracking-[-0.4px] leading-tight"
          style={{ color: T.ink, fontWeight: 500, fontFamily: T.display }}
        >
          {call.title}
        </h2>
        <p className="text-[14px] leading-5" style={{ color: T.inkMuted }}>
          {call.description}
        </p>
        {timestamp ? (
          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: T.border }}>
            <span className="text-[13px]" style={{ color: T.inkFaint }}>
              {timestampLabel}
            </span>
            <span className="text-[14px]" style={{ color: T.ink }}>
              {dateFormat.format(new Date(timestamp))}
            </span>
          </div>
        ) : null}
      </div>

      {call.resultSummary ? (
        <div
          className="p-5 flex flex-col gap-3"
          style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16 }}
        >
          <p
            className="text-[12px] uppercase tracking-[0.6px]"
            style={{ color: T.inkFaint, fontWeight: 600 }}
          >
            Result
          </p>
          <p className="text-[15px] leading-5" style={{ color: T.ink }}>
            {call.resultSummary}
          </p>
          {call.savedMonthlyCents !== undefined ? (
            <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: T.border }}>
              <span className="text-[13px]" style={{ color: T.inkFaint }}>
                Monthly savings
              </span>
              <span className="text-[16px]" style={{ color: T.success, fontWeight: 500 }}>
                €{(call.savedMonthlyCents / 100).toFixed(2)}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
