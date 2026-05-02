export type CallStatus = 'scheduled' | 'in_progress' | 'successful' | 'failed'

export interface Call {
  id: string
  title: string
  description: string
  status: CallStatus
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
