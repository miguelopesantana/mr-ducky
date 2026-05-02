import { authedClient } from './api-client'

const CENTS = 100

export interface CategoryStat {
  name: string
  icon: string
  transactionCount: number
  spent: number
  budget: number
}

export interface SubscriptionItem {
  name: string
  amount: number
  cycle: string
  color: string
  initials: string
}

export interface DashboardData {
  monthLabel: string
  totalSpent: number
  totalBudget: number
  weeklySpending: number[]
  categories: CategoryStat[]
  subscriptions: SubscriptionItem[]
  subscriptionTotal: number
}

interface ApiDashboard {
  month: string
  monthlySpending: { spent: number; budget: number; currency: string; deltaVsBudget: number }
  weeklySpending: { weekNumber: number; spent: number }[]
  categories: {
    id: number
    name: string
    emoji: string
    color: string
    spent: number
    budget: number
    transactionCount: number
  }[]
  subscriptions: {
    items: {
      id: number
      name: string
      amount: number
      billingCycle: string
      nextChargeDate: string
      color: string | null
      initials: string | null
    }[]
    totalMonthly: number
  }
}

export function currentMonth(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function formatMonthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
}

function formatCycle(billingCycle: string, nextChargeDate: string): string {
  const d = new Date(nextChargeDate)
  const day = d.getDate()
  const month = d.toLocaleString('en', { month: 'short' }).toLowerCase()
  const cycle = billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)
  return `${cycle}, next on ${day} ${month}`
}

export async function getDashboardData(
  token: string,
  month: string = currentMonth(),
): Promise<DashboardData> {
  const client = authedClient(token)
  const res = await client<ApiDashboard>(`/dashboard?month=${month}`, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Dashboard fetch failed (${res.status}): ${res.error}`)
  }
  return mapDashboard(res.data)
}

function mapDashboard(api: ApiDashboard): DashboardData {
  return {
    monthLabel: formatMonthLabel(api.month),
    totalSpent: Math.round(api.monthlySpending.spent / CENTS),
    totalBudget: Math.round(api.monthlySpending.budget / CENTS),
    weeklySpending: api.weeklySpending.slice(0, 4).map(w => Math.round(w.spent / CENTS)),
    categories: api.categories.map(c => ({
      name: c.name,
      icon: c.emoji,
      transactionCount: c.transactionCount,
      spent: Math.round(c.spent / CENTS),
      budget: Math.round(c.budget / CENTS),
    })),
    subscriptions: api.subscriptions.items.map(s => ({
      name: s.name,
      amount: s.amount / CENTS,
      cycle: formatCycle(s.billingCycle, s.nextChargeDate),
      color: s.color ?? '#888888',
      initials: s.initials ?? s.name.charAt(0).toUpperCase(),
    })),
    subscriptionTotal: Math.round((api.subscriptions.totalMonthly / CENTS) * 100) / 100,
  }
}
