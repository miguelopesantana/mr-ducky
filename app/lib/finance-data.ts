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

export interface WeekBucket {
  spent: number
  label: string
}

export interface DashboardData {
  monthLabel: string
  totalSpent: number
  totalBudget: number
  weeklySpending: WeekBucket[]
  categories: CategoryStat[]
  subscriptions: SubscriptionItem[]
  subscriptionTotal: number
}

export interface TransactionItem {
  id: number
  categoryId: number | null
  bank: string
  merchantName: string
  amount: number
  type: 'expense' | 'income'
  occurredAt: string
}

export interface TransactionCategory {
  id: number
  name: string
}

export interface TransactionsData {
  items: TransactionItem[]
  categories: Map<number, TransactionCategory>
}

interface ApiDashboard {
  month: string
  monthlySpending: { spent: number; budget: number; currency: string; deltaVsBudget: number }
  weeklySpending: { weekNumber: number; weekStart: string; spent: number }[]
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

interface ApiTransactionPage {
  items: {
    id: number
    categoryId: number | null
    bank: string
    merchantName: string
    amount: number
    type: 'expense' | 'income'
    occurredAt: string
  }[]
  nextCursor: string | null
}

interface ApiCategory {
  id: number
  name: string
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

function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00')
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
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
  const [dashRes, weeklyRes] = await Promise.all([
    client<ApiDashboard>(`/dashboard?month=${month}`, { cache: 'no-store' }),
    client<{ weeks: { weekNumber: number; weekStart: string; spent: number }[] }>(
      '/dashboard/weekly',
      { cache: 'no-store' },
    ),
  ])
  if (!dashRes.ok) {
    throw new Error(`Dashboard fetch failed (${dashRes.status}): ${dashRes.error}`)
  }
  if (!weeklyRes.ok) {
    throw new Error(`Weekly fetch failed (${weeklyRes.status}): ${weeklyRes.error}`)
  }
  return mapDashboard(dashRes.data, weeklyRes.data.weeks)
}

export async function getTransactionsData(
  token: string,
  options?: { search?: string; limit?: number },
): Promise<TransactionsData> {
  const client = authedClient(token)
  const query = new URLSearchParams()
  query.set('limit', String(options?.limit ?? 100))
  if (options?.search) {
    query.set('search', options.search)
  }

  const [transactionsRes, categoriesRes] = await Promise.all([
    client<ApiTransactionPage>(`/transactions?${query.toString()}`, { cache: 'no-store' }),
    client<ApiCategory[]>('/categories', { cache: 'no-store' }),
  ])

  if (!transactionsRes.ok) {
    throw new Error(`Transactions fetch failed (${transactionsRes.status}): ${transactionsRes.error}`)
  }
  if (!categoriesRes.ok) {
    throw new Error(`Categories fetch failed (${categoriesRes.status}): ${categoriesRes.error}`)
  }

  return {
    items: transactionsRes.data.items,
    categories: new Map(categoriesRes.data.map(category => [category.id, category])),
  }
}

function mapDashboard(
  api: ApiDashboard,
  rollingWeeks: { weekNumber: number; weekStart: string; spent: number }[],
): DashboardData {
  return {
    monthLabel: formatMonthLabel(api.month),
    totalSpent: Math.round(api.monthlySpending.spent / CENTS),
    totalBudget: Math.round(api.monthlySpending.budget / CENTS),
    weeklySpending: rollingWeeks.map(w => ({
      spent: Math.round(w.spent / CENTS),
      label: formatWeekLabel(w.weekStart),
    })),
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
