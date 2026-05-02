import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { AccountActionsCard } from '@/components/settings/account-actions-card'
import {
  CategoryManagementCard,
  type CategoryItem,
} from '@/components/settings/category-management-card'
import { NotificationsCard } from '@/components/settings/notifications-card'
import { PrivacySecurityCard } from '@/components/settings/privacy-security-card'
import { ProfileCard } from '@/components/settings/profile-card'
import { authedClient } from '@/lib/api-client'

interface ApiCategoryWithStats {
  id: number
  name: string
  emoji: string
  color: string
  monthlyBudget: number
  spent: number
  transactionCount: number
}

interface ApiUserMe {
  name: string
  currency: string
}

export default async function SettingsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')
  if (!token) redirect('/login')

  const client = authedClient(token.value)
  const [categoriesRes, meRes] = await Promise.all([
    client<ApiCategoryWithStats[]>('/categories', { cache: 'no-store' }),
    client<ApiUserMe>('/auth/me', { cache: 'no-store' }),
  ])

  if (!categoriesRes.ok) {
    throw new Error(`Categories fetch failed (${categoriesRes.status}): ${categoriesRes.error}`)
  }
  if (!meRes.ok) {
    throw new Error(`Profile fetch failed (${meRes.status}): ${meRes.error}`)
  }

  const categories: CategoryItem[] = categoriesRes.data.map((c) => ({
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    color: c.color,
    monthlyBudget: c.monthlyBudget,
  }))

  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-col gap-6 px-4 pt-4">
      <PageHeader title="Settings" subtitle="Manage your preferences" />
      <ProfileCard initialName={meRes.data.name} initialCurrency={meRes.data.currency} />
      {/* <NotificationsCard /> */}
      <CategoryManagementCard categories={categories} />
      <PrivacySecurityCard />
      <AccountActionsCard />
    </div>
  )
}
