import fs from 'fs'
import path from 'path'

const MONTHLY_BUDGET = 12000

const CATEGORY_CONFIG: Record<string, { displayName: string; icon: string; budget: number }> = {
  Shopping: { displayName: 'Shopping', icon: '🛍️', budget: 3500 },
  'Food & Drink': { displayName: 'Restaurants', icon: '🍽️', budget: 1200 },
  Entertainment: { displayName: 'Entertainment', icon: '🎭', budget: 1500 },
  Travel: { displayName: 'Transport', icon: '🚌', budget: 1500 },
}

export const SUBSCRIPTIONS = [
  { name: 'Netflix', amount: 13.99, cycle: 'Monthly, next on 21 oct', color: '#E50914', initials: 'N' },
  { name: 'Spotify', amount: 9.99, cycle: 'Monthly, next on 21 oct', color: '#1DB954', initials: 'S' },
  { name: 'iCloud Storage', amount: 2.99, cycle: 'Monthly, next on 21 oct', color: '#147EFB', initials: 'i' },
  { name: 'Gym Membership', amount: 45.99, cycle: 'Monthly, next on 21 oct', color: '#FF6B35', initials: 'G' },
] as const

interface Transaction {
  date: Date
  category: string
  amount: number
  type: string
}

function readTransactions(): Transaction[] {
  // CSV is at workspace root; process.cwd() = app/ when running `next dev`
  const candidates = [
    path.join(process.cwd(), '..', 'dummy-data', 'Personal_Finance_Dataset.csv'),
    path.join(process.cwd(), 'dummy-data', 'Personal_Finance_Dataset.csv'),
  ]
  const csvPath = candidates.find(p => fs.existsSync(p))
  if (!csvPath) throw new Error('Could not find Personal_Finance_Dataset.csv')

  const lines = fs.readFileSync(csvPath, 'utf-8').trim().split('\n').slice(1)
  return lines
    .filter(l => l.trim())
    .map(line => {
      const parts = line.split(',')
      // Layout: date, description (may contain commas), category, amount, type
      // Work backwards from the end to be safe
      const type = parts[parts.length - 1].trim()
      const amount = parseFloat(parts[parts.length - 2])
      const category = parts[parts.length - 3]
      const dateStr = parts[0]
      return { date: new Date(dateStr), category, amount, type }
    })
    .filter(t => !isNaN(t.amount) && !isNaN(t.date.getTime()))
}

export interface CategoryStat {
  name: string
  icon: string
  transactionCount: number
  spent: number
  budget: number
}

export interface DashboardData {
  monthLabel: string
  totalSpent: number
  totalBudget: number
  weeklySpending: number[]
  categories: CategoryStat[]
  subscriptions: typeof SUBSCRIPTIONS
  subscriptionTotal: number
}

export function getDashboardData(): DashboardData {
  const transactions = readTransactions()

  // Most recent month in dataset
  const latest = transactions.reduce((max, t) => (t.date > max ? t.date : max), new Date(0))
  const year = latest.getFullYear()
  const month = latest.getMonth()

  const expenses = transactions.filter(
    t =>
      t.date.getFullYear() === year &&
      t.date.getMonth() === month &&
      t.type === 'Expense',
  )

  const totalSpent = Math.round(expenses.reduce((s, t) => s + t.amount, 0))

  // Week buckets: 1-7, 8-14, 15-21, 22-end
  const weekly = [0, 0, 0, 0]
  expenses.forEach(t => {
    weekly[Math.min(Math.floor((t.date.getDate() - 1) / 7), 3)] += t.amount
  })

  // Category breakdown for the 4 displayed categories
  const statMap: Record<string, { count: number; spent: number }> = {}
  expenses.forEach(t => {
    const cfg = CATEGORY_CONFIG[t.category]
    if (!cfg) return
    const key = cfg.displayName
    if (!statMap[key]) statMap[key] = { count: 0, spent: 0 }
    statMap[key].count++
    statMap[key].spent += t.amount
  })

  const categories: CategoryStat[] = Object.entries(CATEGORY_CONFIG).map(([, cfg]) => {
    const s = statMap[cfg.displayName] ?? { count: 0, spent: 0 }
    return {
      name: cfg.displayName,
      icon: cfg.icon,
      transactionCount: s.count,
      spent: Math.round(s.spent),
      budget: cfg.budget,
    }
  })

  const subscriptionTotal = SUBSCRIPTIONS.reduce((s, sub) => s + sub.amount, 0)

  const monthLabel = new Date(year, month, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  })

  return {
    monthLabel,
    totalSpent,
    totalBudget: MONTHLY_BUDGET,
    weeklySpending: weekly.map(Math.round),
    categories,
    subscriptions: SUBSCRIPTIONS,
    subscriptionTotal: Math.round(subscriptionTotal * 100) / 100,
  }
}
