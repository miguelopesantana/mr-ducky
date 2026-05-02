import { PageHeader } from '@/components/layout/page-header'
import { ProfileCard } from '@/components/settings/profile-card'

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-col gap-6 px-4 pt-4">
      <PageHeader title="Settings" subtitle="Manage your preferences" />
      <ProfileCard />
    </div>
  )
}
