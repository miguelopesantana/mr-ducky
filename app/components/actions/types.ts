export type CallStatus = 'scheduled' | 'in_progress' | 'successful' | 'failed'

export const CALL_STATUS_RANK: Record<CallStatus, number> = {
  in_progress: 0,
  scheduled: 1,
  successful: 2,
  failed: 3,
}

export interface Call {
  id: string
  title: string
  description: string
  status: CallStatus
  currentAmountCents?: number
  targetAmountCents?: number
  competitorOffer?: string
  scheduledFor?: string
  completedAt?: string
  resultSummary?: string
  savedMonthlyCents?: number
}

export interface Routine {
  id: string
  title: string
  description: string
  enabled: boolean
}
