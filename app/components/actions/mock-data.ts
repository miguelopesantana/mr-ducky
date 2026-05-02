import type { Call, Routine } from './types'

export const INITIAL_CALLS: Call[] = [
  {
    id: 'movistar-mobile',
    title: 'Renegotiate Movistar mobile',
    description: 'Aim for €5/mo lower than current plan or matching offer.',
    status: 'in_progress',
    scheduledFor: '2026-05-02T10:30:00Z',
  },
  {
    id: 'vodafone-fiber',
    title: 'Negotiate Vodafone fiber',
    description: 'Loyalty discount or move to a competitor offer.',
    status: 'scheduled',
    scheduledFor: '2026-05-04T09:00:00Z',
  },
  {
    id: 'engie-energy',
    title: 'Lower ENGIE energy plan',
    description: 'Switch to off-peak tariff if available.',
    status: 'successful',
    completedAt: '2026-04-28T14:12:00Z',
    resultSummary: 'Switched to off-peak tariff. Confirmation sent to email.',
    savedMonthlyCents: 800,
  },
  {
    id: 'multisport-cancel',
    title: 'Cancel MultiSports membership',
    description: 'Cancel and request prorated refund.',
    status: 'failed',
    completedAt: '2026-04-21T11:40:00Z',
    resultSummary: 'Provider declined refund. Cancellation effective at end of cycle.',
  },
]

export const INITIAL_ROUTINES: Routine[] = [
  {
    id: 'auto-categorize',
    title: 'Subscriptions',
    description: 'Categorize transactions automatically based on category goals.',
    enabled: true,
  },
]
